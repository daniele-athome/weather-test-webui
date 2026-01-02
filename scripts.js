import './styles.scss';

import * as bootstrap from 'bootstrap'
import $ from "jquery";
import * as SunCalc from 'suncalc';
import Feels from 'feels';
import * as Highcharts from 'highcharts';
// noinspection ES6UnusedImports
import * as HighchartsAdaptive from 'highcharts/themes/adaptive';
// noinspection ES6UnusedImports
import * as HighchartsBrokenAxis from 'highcharts/modules/broken-axis';
// noinspection ES6UnusedImports
import * as HighchartsStock from 'highcharts/modules/stock';

import dayLandscapeImage from './images/day-landscape.png';
import nightLandscapeImage from './images/night-landscape.png';

const weatherIcons = import.meta.glob('./images/weather-icons/*.svg', { eager: true });
const getWeatherIcon = (name) => {
    return weatherIcons[`./images/weather-icons/${name}.svg`]?.default;
}

const milesToKilometers = (miles) => {
    return Math.round(miles * 1.609344);
}

const themeManager = {
    body: document.querySelector('body'),
    themeToggle: document.querySelector('#flexSwitchCheckChecked'),

    initialize: function () {
        this.themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        this.getSavedTheme();
    },

    toggleTheme: function () {
        this.body.classList.toggle('dark');
        this.body.classList.toggle('highcharts-dark');
        localStorage.setItem('theme', this.body.classList.contains('dark') ? 'dark' : 'light');
    },

    getSavedTheme: function () {
        const userTheme = localStorage.getItem('theme');
        if (userTheme === 'dark') {
            this.themeToggle.checked = true;
            this.toggleTheme();
        }
    },
};

const sunTimesManager = {
    timeFormatOptions: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    },
    localDate: null,
    sunriseTime: null,
    sunsetTime: null,

    sunriseTimeText: document.querySelector('#sunrise-time'),
    sunsetTimeText: document.querySelector('#sunset-time'),
    sceneryImage: document.querySelector('#scenery'),

    initialize: function () {
        this.localDate = localDateTime();
        let sunTimes = SunCalc.getTimes(this.localDate,
            import.meta.env.VITE_LOCATION_LATITUDE,
            import.meta.env.VITE_LOCATION_LONGITUDE,
            import.meta.env.VITE_LOCATION_HEIGHT);
        this.sunriseTime = sunTimes.sunrise;
        this.sunsetTime = sunTimes.sunset;

        this.sunriseTimeText.innerHTML =
            this.sunriseTime.toLocaleTimeString([], this.timeFormatOptions);
        this.sunsetTimeText.innerHTML =
            this.sunsetTime.toLocaleTimeString([], this.timeFormatOptions);

        this.changeSceneryImage();
    },

    changeSceneryImage: function () {
        if (this.isNight()) {
            this.sceneryImage.src = nightLandscapeImage;
            this.sceneryImage.alt = 'Night landscape';
        } else {
            this.sceneryImage.src = dayLandscapeImage;
            this.sceneryImage.alt = 'Day landscape';
        }
    },

    isNight: function () {
        const sunriseHour = this.sunriseTime.getHours();
        const sunsetHour = this.sunsetTime.getHours();

        return this.localDate.getHours() < sunriseHour ||
            this.localDate.getHours() >= sunsetHour;
    }
};

const weatherManager = {
    weatherUrl: import.meta.env.VITE_WEATHER_API_URL + "/latest?limit=1440",
    metarUrl: import.meta.env.VITE_WEATHER_API_URL + "/metar",
    cloudCover: {
        'CAVOK': 0,
        'FEW': 20,
        'SCT': 40,
        'BKN': 75,
        'OVC': 100
    },
    // to be used if it's not raining
    cloudCoverageIcon: {
        0: {day: 'clear-day', night: 'starry-night'},
        20: {day: 'partly-cloudy-day', night: 'partly-cloudy-night'},
        40: {day: 'overcast-day', night: 'overcast-night'},
        75: {day: 'overcast', night: 'overcast'},
        100: {day: 'extreme', night: 'extreme'},
    },

    // TODO element selectors

    initialize: function () {
        $.when(
            this.requestWeather(),
            this.requestMetar(),
        ).done((weatherArgs, metarArgs) => {
            console.log('Both weather and metar are available');
            console.log(weatherArgs);
            console.log(metarArgs);

            this.updateCondition();
        });
    },

    requestWeather: function () {
        return $.getJSON(this.weatherUrl, (data) => {
            // item are in reversed temporal order, so the first one is the more recent
            let latest = data[0];
            let timestamp = new Date(latest['timestamp']);

            document.querySelector('#today').innerHTML = timestamp.toLocaleDateString([], {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                },
            ) + ', ' + timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                second: '2-digit',
                timeZoneName: 'longOffset',
            });
            document.querySelector('#temp-now').innerHTML = this.roundTemperature(latest['temperature']).toString();
            document.querySelector('#humidity').innerHTML = this.roundHumidity(latest['humidity']).toString();
            document.querySelector('#dew-point').innerHTML = this.roundTemperature(latest['dew_point']).toString();
            document.querySelector('#presure').innerHTML = this.roundPressure(latest['pressure']).toString();
            document.querySelector('#wind-speed').innerHTML = latest['wind_speed'].toFixed(0);
            document.querySelector('#wind-direction').innerHTML = latest['wind_direction'];

            const config = {
                temp: latest['temperature'],
                humidity: latest['humidity'],
                speed: latest['wind_speed'],
                units: {
                    temp: 'c',
                    speed: 'mps'
                }
            };
            document.querySelector('#feels-like').innerHTML = new Feels(config).like().toFixed(1);

            this.createHistoricalCharts(data);

            // TODO dummy stuff
            document.querySelector('#description-temp').innerHTML = 'Sereno';
        });
    },

    requestMetar: function () {
        return $.getJSON(this.metarUrl, (data) => {
            if (data === undefined || data === null) {
                document.querySelector('#condition-icon').style.display = 'none';
            }
            else if (data.hasOwnProperty('cover')) {
                const cloudCoverage = this.cloudCover[data.cover];
                if (cloudCoverage !== undefined) {
                    document.querySelector('#clouds').innerHTML = cloudCoverage.toString();
                }

                const cloudIcon = this.cloudCoverageIcon[cloudCoverage];
                if (cloudIcon !== undefined) {
                    const realCloudIcon = sunTimesManager.isNight() ? cloudIcon.night : cloudIcon.day;
                    document.querySelector('#condition-icon').src = getWeatherIcon(realCloudIcon);
                }

                if (data.cover === 'CAVOK') {
                    // special condition that includes visibility of 10+ km
                    document.querySelector('#visibility').innerHTML = '10';
                }
                else if (data.hasOwnProperty('visib')) {
                    document.querySelector('#visibility').innerHTML =
                        milesToKilometers(parseInt(data.visib)).toString();
                }
            }
        });
    },

    createHistoricalCharts: function(data) {
        let seriesTemperature = [];
        let seriesDewpoint = [];
        let seriesHumidity = [];
        let seriesPressure = [];
        for (let item of data) {
            seriesTemperature.push([item['timestamp'], this.roundTemperature(item['temperature'])]);
            seriesDewpoint.push([item['timestamp'], this.roundTemperature(item['dew_point'])]);
            seriesHumidity.push([item['timestamp'], this.roundHumidity(item['humidity'])]);
            seriesPressure.push([item['timestamp'], this.roundPressure(item['pressure'])]);
        }
        seriesTemperature.sort((a, b) => a[0].localeCompare(b[0]));
        seriesDewpoint.sort((a, b) => a[0].localeCompare(b[0]));
        seriesHumidity.sort((a, b) => a[0].localeCompare(b[0]));
        seriesPressure.sort((a, b) => a[0].localeCompare(b[0]));
        console.log(seriesTemperature);
        console.log(seriesDewpoint);
        console.log(seriesHumidity);
        console.log(seriesPressure);

        const chartOptions = {
            chart: {
                type: 'spline',
                height: 250,
                zooming: {
                    type: 'x'
                },
            },
            time: {
                timezone: import.meta.env.VITE_LOCATION_TIMEZONE,
            },
            legend: {
                enabled: false,
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: {
                    // TODO
                    //month: '%e. %b',
                    //year: '%b'
                },
                gridLineWidth: 1,
                showEmpty: true,
                minPadding: 0,
                maxPadding: 0,
                // 1 minute ticks
                tickInterval: 60*1000,
                title: false,
            },
            plotOptions: {
                series: {
                    marker: {
                        enabled: false,
                        radius: 4,
                        //lineColor: '#666666',
                        lineWidth: 1
                    },
                    dataGrouping: {
                        enabled: true,
                        groupPixelWidth: 5,
                    },
                    gapSize: 100,
                    gapUnit: 'relative',
                    label: {
                        connectorAllowed: false
                    },
                }
            },
            credits: {
                enabled: false
            },
            tooltip: {
                enabled: true,
                shared: true,
                valueSuffix: ' °C',
                valueDecimals: 1,
            },
            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 500
                    },
                }]
            }
        };

        Highcharts.chart('chart-temperature', {
            ...chartOptions,
            title: {
                text: 'Temperatura (°C)',
            },
            yAxis: {
                gridLineWidth: 1,
                showEmpty: true,
                tickInterval: 5,
                minPadding: 0,
                maxPadding: 0,
                title: false,
            },
            series: [{
                name: 'Temperatura',
                marker: {
                    symbol: 'circle'
                },
                data: seriesTemperature,
                color: '#2d87ff',
            }, {
                name: 'Punto di rugiada',
                marker: {
                    symbol: 'circle'
                },
                data: seriesDewpoint,
                color: '#f53e3e',
            }],
        });

        Highcharts.chart('chart-humidity', {
            ...chartOptions,
            title: {
                text: 'Umidità (%)',
            },
            yAxis: {
                gridLineWidth: 1,
                showEmpty: true,
                tickInterval: 5,
                minPadding: 0,
                maxPadding: 0,
                title: false,
            },
            tooltip: {
                enabled: true,
                valueSuffix: '%',
                shared: true,
                valueDecimals: 0,
            },
            series: [{
                name: 'Umidità',
                marker: {
                    symbol: 'circle'
                },
                data: seriesHumidity,
            }],
        });

        Highcharts.chart('chart-pressure', {
            ...chartOptions,
            title: {
                text: 'Pressione (mbar)',
            },
            yAxis: {
                gridLineWidth: 1,
                showEmpty: true,
                tickInterval: 5,
                minPadding: 0,
                maxPadding: 0,
                title: false,
            },
            tooltip: {
                enabled: true,
                valueSuffix: ' mbar',
                shared: true,
                valueDecimals: 0,
            },
            series: [{
                name: 'Pressione',
                marker: {
                    symbol: 'circle'
                },
                data: seriesPressure,
            }],
        });
    },

    updateCondition: function () {
        // TODO infer a flight condition from weather and metar data
        document.querySelector('#condition-msg').innerHTML =
            '<i class="fa-solid fa-circle-check"></i> Condizioni ideali';
    },

    roundTemperature: function(temperature) {
        return parseFloat(temperature.toFixed(1));
    },

    roundHumidity: function(humidity) {
        return parseFloat(humidity.toFixed(0));
    },

    roundPressure: function(humidity) {
        return parseFloat(humidity.toFixed(0));
    },
};

const localDateTime = () => {
    // TODO we should location timezone instead of the browser one
    return new Date();
}

document.addEventListener("DOMContentLoaded", () => {
    themeManager.initialize();
    sunTimesManager.initialize();
    weatherManager.initialize();

    // tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
});

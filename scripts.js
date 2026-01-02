import './styles.scss';

import * as bootstrap from 'bootstrap'
import $ from "jquery";
import * as SunCalc from 'suncalc';
import Feels from 'feels';
import * as Highcharts from 'highcharts';
// noinspection ES6UnusedImports
import * as HighchartsAdaptive from 'highcharts/themes/adaptive';

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
    weatherUrl: import.meta.env.VITE_WEATHER_API_URL + "/latest?limit=50",
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
            document.querySelector('#temp-now').innerHTML = latest['temperature'].toFixed(1);
            document.querySelector('#humidity').innerHTML = latest['humidity'].toFixed(0);
            document.querySelector('#dew-point').innerHTML = latest['dew_point'].toFixed(1);
            document.querySelector('#presure').innerHTML = latest['pressure'].toFixed(0);
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
        const randomOffset = () => {
            // TEST return Math.round((Math.random() * 10 - 5) * 10) / 10
            return 0;
        };

        let seriesTemp = [];
        let seriesDew = [];
        let seriesHum = [];
        for (let item of data) {
            let offset = randomOffset();
            seriesTemp.push([item['timestamp'], item['temperature'] + offset]);
            seriesDew.push([item['timestamp'], item['dew_point'] + offset]);
            seriesHum.push([item['timestamp'], item['humidity'] + offset]);
        }
        seriesTemp.sort((a, b) => a[0].localeCompare(b[0]));
        seriesDew.sort((a, b) => a[0].localeCompare(b[0]));
        seriesHum.sort((a, b) => a[0].localeCompare(b[0]));
        console.log(seriesTemp);
        console.log(seriesDew);
        console.log(seriesHum);

        const chartOptions = {
            chart: {
                type: 'line',
                height: 250,
                zooming: {
                    type: 'x'
                },
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
                    label: {
                        connectorAllowed: false
                    },
                    //pointStart: 2010
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
                /*labels: {
                    format: '{value} °C'
                },*/
                title: false,
            },
            series: [{
                name: 'Temperatura',
                data: seriesTemp,
                color: '#2d87ff',
            }, {
                name: 'Punto di rugiada',
                data: seriesDew,
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
                /*labels: {
                    format: '{value}%'
                },*/
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
                data: seriesHum,
            }],
        });
    },

    updateCondition: function () {
        // TODO infer a flight condition from weather and metar data
        document.querySelector('#condition-msg').innerHTML =
            '<i class="fa-solid fa-circle-check"></i> Condizioni ideali';
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

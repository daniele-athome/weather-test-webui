import './styles.scss';

import * as bootstrap from 'bootstrap'
import $ from "jquery";
import * as SunCalc from 'suncalc';
import Feels from 'feels';

import dayLandscapeImage from './images/day-landscape.png';
import nightLandscapeImage from './images/night-landscape.png';

const weatherIcons = import.meta.glob('./images/weather-icons/*.svg', { eager: true });
const getWeatherIcon = (name) => {
    console.log(weatherIcons);
    return weatherIcons[`./images/weather-icons/${name}.svg`]?.default;
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
    weatherUrl: import.meta.env.VITE_WEATHER_API_URL + "/latest?limit=1",
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

            // TODO dummy stuff
            document.querySelector('#description-temp').innerHTML = 'Sereno';
        });
    },

    requestMetar: function () {
        return $.getJSON(this.metarUrl, (data) => {
            if (data.hasOwnProperty('cover')) {
                const cloudCoverage = this.cloudCover[data.cover];
                if (cloudCoverage !== undefined) {
                    document.querySelector('#clouds').innerHTML = cloudCoverage.toString();
                }

                const cloudIcon = this.cloudCoverageIcon[cloudCoverage];
                console.log(cloudIcon);
                if (cloudIcon !== undefined) {
                    const realCloudIcon = sunTimesManager.isNight() ? cloudIcon.night : cloudIcon.day;
                    document.querySelector('#condition-icon').src = getWeatherIcon(realCloudIcon);
                }

                if (data.cover === 'CAVOK') {
                    // special condition that includes visibility of 10+ km
                    document.querySelector('#visibility').innerHTML = '10';
                }
            }
        });
    },

    updateCondition: function () {
        // TODO infer a flight condition from weather and metar data
        document.querySelector('#condition-msg').innerHTML =
            '<i class="fa-solid fa-circle-check"></i> Condizioni ideali';
    }
};

function localDateTime() {
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

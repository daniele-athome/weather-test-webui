import './styles.scss';

import * as bootstrap from 'bootstrap'
import $ from "jquery";

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
    initialize: function () {
        // TODO set sun times
    },

    // TODO
    changeSceneryImage: function (data, localDateObject, sunriseTime, sunsetTime) {
        const scenery = document.querySelector('#scenery');
        const sunriseHour = this.convertUnixToTimezone(sunriseTime, data.timezone).getHours();
        const sunsetHour = this.convertUnixToTimezone(sunsetTime, data.timezone).getHours();

        if (
            this.convertUnixToTimezone(localDateObject, data.timezone).getHours() < sunriseHour ||
            this.convertUnixToTimezone(localDateObject, data.timezone).getHours() >= sunsetHour
        ) {
            scenery.src = '/assets/night-landscape.png';
            scenery.alt = 'Night landscape';
        } else {
            scenery.src = '/assets/day-landscape.png';
            scenery.alt = 'Day landscape';
        }
    },
};

document.addEventListener("DOMContentLoaded", () => {
    themeManager.initialize();
    sunTimesManager.initialize();

    // tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    $.getJSON("http://localhost:8787/latest?limit=1", function (data) {
        let latest = data[0];
        $("#currentWeatherData").text(JSON.stringify(latest, null, 2));

        let timestamp = new Date(latest['timestamp']);

        $('#today').text(timestamp.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
            },
        ) + ', ' + timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            second: '2-digit',
            timeZoneName: 'shortOffset',
        }));
        $('#temp-now').text(latest['temperature']);
        $('#humidity').text(latest['humidity']);
        $('#dew-point').text(latest['dew_point']);
        $('#presure').text(latest['pressure']);
        $('#wind-speed').text(latest['wind_speed']);
        $('#wind-direction').text(latest['wind_direction']);

        // TODO dummy stuff
        $('#condition-icon').attr('src', '/images/icons/clear-day.svg');
        $('#sunrise-time').text('07:04');
        $('#sunset-time').text('17:12');
    });
});

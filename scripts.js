import './styles.scss';

import * as bootstrap from 'bootstrap'
import $ from "jquery";

document.addEventListener("DOMContentLoaded", () => {
    // tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    $.getJSON("http://localhost:8787/latest?limit=1", function (data) {
        let latest = data[0];
        $("#currentWeatherData").text(JSON.stringify(latest, null, 2));

        let timestamp = new Date(latest['timestamp']);

        $('#dataTimestamp').text(timestamp.toLocaleString());
        $('#dataTemperature').text(latest['temperature']);
        $('#dataHumidity').text(latest['humidity']);
        $('#dataDewPoint').text(latest['dew_point']);
        $('#dataPressure').text(latest['pressure']);
        $('#dataWindSpeed').text(latest['wind_speed']);
        $('#dataWindDirection').text(latest['wind_direction']);
    });
});

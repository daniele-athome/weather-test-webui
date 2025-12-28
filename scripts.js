import './styles.scss';

import * as bootstrap from 'bootstrap'
import $ from "jquery";

document.addEventListener("DOMContentLoaded", () => {
    // tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    $.getJSON("http://localhost:8787/latest?limit=1", function (data) {
        $("#currentWeatherData").text(JSON.stringify(data[0], null, 2));
    });
});

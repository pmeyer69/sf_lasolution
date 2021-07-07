'use strict';

scheduler.attachEvent("onSchedulerReady", function () {
    //mini-cal - these functions are found in every vf that uses the datepicker
    scheduler.templates.calendar_month = function (date) {

        var localesToUseWithoutDateNumber = ['en_US', 'en_GB'];

        if (localesToUseWithoutDateNumber.indexOf(userLocale) != -1) {
            return moment(date).format('MMMM YYYY');
        }

        return moment(date).format('LL');
    };
    scheduler.templates.calendar_date = function (date) {
        return moment(date).format('DD');
    };
    scheduler.templates.calendar_scale_date = function (date) {
        return moment(date).format('ddd');
    };
    scheduler.templates.calendar_time = function (date) {
        return moment(date).format('l');
    };
});
'use strict';

/*

 LoadServiceListService
 Service to aggregate all service list loading functions

 */

(function () {

    LoadServiceListService.$inject = ['$q', 'sfdcService', 'utils', 'TimePhasedDataService', 'servicesService'];

    angular.module('serviceExpert').factory('LoadServiceListService', LoadServiceListService);

    function LoadServiceListService($q, sfdcService, utils, TimePhasedDataService, servicesService) {

        function loadServicesInBulk(servicesObjects, servicesListVisitedDays, pivotDate, backHorizon, offsetId) {

            var deferred = $q.defer(),
                horizon = getBackHorizonToFetch(servicesListVisitedDays, pivotDate, backHorizon),
                fetchedFromDate = utils.addDaysToDate(horizon.date, -horizon.horizon + 1),
                servicesIdsInRange = countServicesInTimeInterval(servicesObjects, pivotDate, backHorizon);

            // dont load from server
            if (!shouldLoadFromServer(servicesListVisitedDays, pivotDate, backHorizon) && !offsetId) {
                deferred.resolve([]);
                return deferred.promise;
            }

            // W-8428744 - don't send array of "already in client" 
            //sfdcService.loadServicesInBulk(horizon.date, horizon.horizon, numberOfServicesToLoadInEachBulk, /* servicesIdsInRange */ [], offsetId).then( res => {
            sfdcService.loadServicesInBulk(horizon.date, horizon.horizon, numberOfServicesToLoadInEachBulk, servicesIdsInRange, offsetId).then(function (res) {

                var needToCheckRules = [];

                res.ganttServiceAppointments.forEach(function (service) {
                    if (service.AssignedResource && !scheduler._events[service.Id]) {
                        needToCheckRules.push(service.Id);
                    }
                });

                if (Array.isArray(res.stms) && res.stms.length > 0) {
                    TimePhasedDataService.updateTimePhaseData(res.stms, 'stm');
                }

                var updatedServices = TimePhasedDataService.updateTimePhaseData(res.ganttServiceAppointments, 'service'),
                    resourcesAndTerritories = TimePhasedDataService.resourcesAndTerritories(),
                    resultServices = {
                    needToCheckRules: needToCheckRules,
                    scheduledServices: [],
                    unscheduledServices: [],
                    remainingCount: res.remainingCount,
                    fetchedFromDate: fetchedFromDate,
                    horizon: horizon,
                    totalFetched: res.ganttServiceAppointments.length,
                    lastFetchedId: res.ganttServiceAppointments[res.ganttServiceAppointments.length - 1] ? res.ganttServiceAppointments[res.ganttServiceAppointments.length - 1].Id : null
                };

                // split to 2 arrays, scheduled services (should be on the gantt) and unscheduled (not on the gantt)
                updatedServices.services.forEach(function (appointment) {

                    // not scheduled
                    if (!appointment.isScheduled()) {

                        // service got unscheduled
                        if (scheduler._events[appointment.id]) {
                            delete scheduler._events[appointment.id];
                        }

                        resultServices.unscheduledServices.push(appointment);
                    } else {
                        // set the GANTT resource id based on timephase
                        appointment.setGanttResource(resourcesAndTerritories, utils.generateResourceId);
                        resultServices.scheduledServices.push(appointment);
                    }
                });

                servicesService.drawServicesAndAbsences(resultServices.scheduledServices, [], [], []);

                deferred.resolve(resultServices);
            }).catch(function (error) {

                deferred.reject(error);
                console.warn('loadServicesInBulk: something went wrong');
                utils.addNotification(customLabels.Action_Could_Not_Be_Performed, error.message || customLabels.user_is_not_allowed_to_perform_action);
            });

            return deferred.promise;
        }

        // should load from server? also updating visited days
        function shouldLoadFromServer(servicesListVisitedDays, endDate, horizionInDays) {

            var i_date = new Date(endDate),
                loadFromServer = false;

            while (horizionInDays) {

                if (!servicesListVisitedDays[utils.generateDateKey(i_date)]) {
                    loadFromServer = true;
                }

                servicesListVisitedDays[utils.generateDateKey(i_date)] = true;
                i_date.setDate(i_date.getDate() - 1);
                horizionInDays--;
            }

            return loadFromServer;
        }

        function getBackHorizonToFetch(servicesListVisitedDays, endDate, backHorizon) {

            var diffInDays = void 0,
                currDT = void 0,
                newStart = utils.addDaysToDate(endDate, -backHorizon + 1),
                newFinish = endDate;

            // base date is inside an interval we got, go right and figure what is the latest date in that interval
            if (servicesListVisitedDays[newStart]) {
                currDT = newStart;

                while (currDT <= newFinish) {
                    if (servicesListVisitedDays[currDT]) currDT = utils.addDaysToDate(currDT, 1);else break;
                }

                diffInDays = (newFinish.getTime() - currDT.getTime()) / (1000 * 60 * 60 * 24);
                diffInDays++;

                return {
                    date: newFinish,
                    horizon: diffInDays
                };
            }

            // base date is not inside an interval we got, go from end date to the left
            else {
                    currDT = newFinish;

                    while (currDT >= newStart) {
                        if (servicesListVisitedDays[currDT]) currDT = utils.addDaysToDate(currDT, -1);else break;
                    }

                    diffInDays = (currDT.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24);
                    diffInDays++;

                    return {
                        date: currDT,
                        horizon: diffInDays
                    };
                }
        }

        function serviceInTimeRange(service, endDate, backHorizon) {

            var start = utils.addDaysToDate(endDate, -backHorizon);

            if (service.earlyStart && service.earlyStart > start && service.earlyStart <= endDate) {
                return true;
            }

            if (service.dueDate && service.dueDate > start && service.dueDate <= endDate) {
                return true;
            }

            if (service.appStart && service.appStart > start && service.appStart <= endDate) {
                return true;
            }

            if (service.appEnd && service.appEnd > start && service.appEnd <= endDate) {
                return true;
            }

            if (service.finish && service.finish > start && service.finish <= endDate) {
                return true;
            }

            if (service.start && service.start > start && service.start <= endDate) {
                return true;
            }

            return false;
        }

        function countServicesInTimeInterval(servicesObjects, endDate, backHorizon) {
            var inRange = [];

            for (var key in servicesObjects) {
                if (serviceInTimeRange(servicesObjects[key], endDate, backHorizon)) inRange.push(key);
            }

            return inRange;
        }

        return {
            getBackHorizonToFetch: getBackHorizonToFetch,
            loadServicesInBulk: loadServicesInBulk
        };
    }
})();
'use strict';

/*

 ServiceSelectorService
 Service for selecting service appointments in the service list

 */

(function () {

    ServiceSelectorService.$inject = ['$filter', 'servicesService', 'TimePhasedDataService', 'sfdcService', 'RegisterService', 'GanttFilterService', 'FieldSetFieldsService'];

    angular.module('serviceExpert').factory('ServiceSelectorService', ServiceSelectorService);

    function ServiceSelectorService($filter, servicesService, TimePhasedDataService, sfdcService, RegisterService, GanttFilterService, FieldSetFieldsService) {

        var SelectedServices = {},
            filter = servicesService.filter,
            serviceListFields = [],
            filteredValue = {};

        RegisterService.register('services', function (services) {
            if (services.deleted) {
                services.deleted.forEach(function (id) {
                    return delete SelectedServices[id];
                });
            }
        });

        FieldSetFieldsService.fieldsSetFields().then(function (fieldsSetFieldsObject) {
            serviceListFields = fieldsSetFieldsObject.ListColumns;
        });

        function returnFilter(services, filter, servicesListFields, allFilters) {
            var isOldFilter = allFilters && allFilters[filter.selectedFilter] && allFilters[filter.selectedFilter].old;
            if (useNewFilters && !isOldFilter) {
                return $filter('servicesListFilterNew')(services, filter, servicesListFields);
            } else {
                return $filter('servicesListFilter')(services, filter, servicesListFields, allFilters);
            }
        }

        function unselectAll() {
            for (var key in SelectedServices) {
                SelectedServices[key] = false;
            }
        }

        function selectAll() {
            filteredValue = returnFilter(TimePhasedDataService.serviceAppointments(), filter, serviceListFields, GanttFilterService.getFilterMap());
            for (var i = 0; i < filteredValue.length; i++) {
                SelectedServices[filteredValue[i].id] = true;
            }
        }

        function selectViolations() {
            unselectAll();
            var filterCopy = angular.copy(filter);
            filterCopy.selectedFilter = 'Violating';
            if (filter.selectedFilter == 'Custom filter') {
                filterCopy.endDate = filter.advancedFilter.maxDate;
            }

            filteredValue = returnFilter(TimePhasedDataService.serviceAppointments(), filter, serviceListFields, GanttFilterService.getFilterMap());
            filteredValue = returnFilter(filteredValue, filterCopy, serviceListFields, GanttFilterService.getFilterMap());
            for (var i = 0; i < filteredValue.length; i++) {
                if (filteredValue[i].violations) {
                    SelectedServices[filteredValue[i].id] = true;
                }
            }
        }

        function selectInJeopardy() {
            unselectAll();
            var filterCopy = angular.copy(filter);
            filterCopy.selectedFilter = 'inJeopardy';
            if (filter.selectedFilter == 'Custom filter') {
                filterCopy.endDate = filter.advancedFilter.maxDate;
            }

            filteredValue = returnFilter(TimePhasedDataService.serviceAppointments(), filter, serviceListFields, GanttFilterService.getFilterMap());
            filteredValue = returnFilter(filteredValue, filterCopy, serviceListFields, GanttFilterService.getFilterMap());

            for (var i = 0; i < filteredValue.length; i++) {
                if (filteredValue[i].jeopardy) {
                    SelectedServices[filteredValue[i].id] = true;
                }
            }
        }

        function selectUnscheduled() {
            unselectAll();
            var filterCopy = angular.copy(filter);
            filterCopy.selectedFilter = 'Unscheduled';
            if (filter.selectedFilter == 'Custom filter') {
                filterCopy.endDate = filter.advancedFilter.maxDate;
            }

            filteredValue = returnFilter(TimePhasedDataService.serviceAppointments(), filter, serviceListFields, GanttFilterService.getFilterMap());
            filteredValue = returnFilter(filteredValue, filterCopy, serviceListFields, GanttFilterService.getFilterMap());
            for (var i = 0; i < filteredValue.length; i++) {
                if (filteredValue[i].isScheduled && !filteredValue[i].isScheduled()) {
                    SelectedServices[filteredValue[i].id] = true;
                }
            }
        }

        function countSelectedServices() {

            var count = 0;

            for (var key in SelectedServices) {
                if (SelectedServices[key]) count++;
            }return count;
        }

        function getSelected() {

            var selectedArray = [];

            for (var id in SelectedServices) {
                SelectedServices[id] && selectedArray.push(id);
            }

            return selectedArray;
        }

        return {
            SelectedServices: SelectedServices,
            unselectAll: unselectAll,
            selectAll: selectAll,
            selectViolations: selectViolations,
            selectInJeopardy: selectInJeopardy,
            selectUnscheduled: selectUnscheduled,
            countSelectedServices: countSelectedServices,
            getSelected: getSelected
        };
    }
})();
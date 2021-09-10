'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    angular.module('serviceExpert').controller('serviceListCtrl', ['$scope', '$compile', '$rootScope', '$filter', 'utils', '$timeout', '$sce', 'servicesService', 'sfdcService', 'ResourcesAndTerritoriesService', 'GetSlotsService', 'userSettingsManager', 'StateService', 'TimePhasedDataService', 'LoadServiceListService', 'FieldSetFieldsService', 'ServiceAppointmentLightboxService', 'ServiceSelectorService', 'SERVICE_STATUS', 'SERVICE_CATEGORY', 'DeltaService', 'RegisterService', 'GanttFilterService', 'GeneralLightbox', 'LeftSideLocationFilteringService', '$q', 'BundleService', 'BundleActions', 'listQuickActionsService', function ($scope, $compile, $rootScope, $filter, utils, $timeout, $sce, servicesService, sfdcService, ResourcesAndTerritoriesService, GetSlotsService, userSettingsManager, StateService, TimePhasedDataService, LoadServiceListService, FieldSetFieldsService, ServiceAppointmentLightboxService, ServiceSelectorService, SERVICE_STATUS, SERVICE_CATEGORY, DeltaService, RegisterService, GanttFilterService, GeneralLightbox, LeftSideLocationFilteringService, $q, BundleService, BundleActions, listQuickActionsService) {

        $scope.bundleService = BundleService;
        $scope.bundlerActions = BundleActions;
        //RTL support
        $scope.isRtlDir = StateService.isRtlDirection();
        $scope.tooltipDirection = $scope.isRtlDir ? 'left-bottom' : 'right';
        var firstLoadForSplunk = true;

        angular.element(document).ready(function () {

            var widthSplitterInited = false;
            var isRtlDirection = $scope.isRtlDir;

            initSplitter();
            $(window).bind('resize', initSplitter);

            function initSplitter() {

                var leftWidth = userSettingsManager.GetUserSettingsProperty('Left_Panel_Width_Percentage__c'),
                    widthToPut = 400,
                    parent = $('#contentWrapper'),
                    topHeight = userSettingsManager.GetUserSettingsProperty('Services_List_Height_Percentage__c'),
                    heightToPut = 250,
                    heightParent = $('#SmartPanelContainer');

                if (parent.length === 0) parent = $(window);

                if (heightParent.length === 0) heightParent = $(window);

                if (!parent.width() == 0 && !widthSplitterInited) {
                    widthSplitterInited = true;
                    if (leftWidth != null && leftWidth > 0 && leftWidth < 100) {
                        widthToPut = parent.width() * leftWidth * 0.01;
                    }

                    if (widthToPut < 400) widthToPut = 400;

                    var widthForJquery = widthToPut + 3;
                    /*-------------------RTL support---------------*/
                    if (isRtlDirection) {
                        var leftSide = document.getElementById('LeftSideContainer');
                        var rightSide = document.getElementById('RightSideContainer');
                        leftSide.before(rightSide);
                        $('#LeftSideContainer').width('calc(100% - ' + widthForJquery + 'px)');

                        Split(['#RightSideContainer', '#LeftSideContainer'], {
                            sizes: [widthToPut + 'px'],
                            minSize: [700, 400],
                            snapOffset: 10,
                            gutterSize: 3,
                            onDragEnd: function onDragEnd() {
                                updateViewDebounced();
                                var draggedEl = isRtlDirection ? '#RightSideContainer' : '#LeftSideContainer';
                                var newPercent = $(draggedEl).width() / parent.width();
                                newPercent *= 100;
                                userSettingsManager.SetUserSettingsProperty('Left_Panel_Width_Percentage__c', newPercent);
                            }

                        });
                    } else {
                        $('#RightSideContainer').width('calc(100% - ' + widthForJquery + 'px)');
                        Split(['#LeftSideContainer', '#RightSideContainer'], {
                            sizes: [widthToPut + 'px'],
                            minSize: [400, 700],
                            snapOffset: 10,
                            gutterSize: 3,
                            onDragEnd: function onDragEnd() {
                                updateViewDebounced();
                                var draggedEl = isRtlDirection ? '#RightSideContainer' : '#LeftSideContainer';
                                var newPercent = $(draggedEl).width() / parent.width();
                                newPercent *= 100;
                                userSettingsManager.SetUserSettingsProperty('Left_Panel_Width_Percentage__c', newPercent);
                            }

                        });
                    }
                }

                $timeout(function () {
                    //CFSL-584 - when side bar is hidden, parent height is 100px which messes up the vertical split.
                    if (heightParent.height() !== 100) {

                        if (topHeight != null && topHeight > 0 && topHeight < 100) {
                            heightToPut = heightParent.height() * topHeight * 0.01;
                        }

                        if (heightToPut > 250) heightToPut = 250;

                        var heightForJquery = heightToPut + 5;

                        $('#ServiceListBottomContainer').height('calc(100% - ' + heightForJquery + 'px');
                        var minSize = heightParent.height() - 250;

                        //dont duplicate gutters
                        var gutterVerticalElement = heightParent.find('.gutter-vertical');
                        gutterVerticalElement.length && gutterVerticalElement.remove();

                        Split(['#ServiceListTopContainer', '#ServiceListBottomContainer'], {
                            direction: 'vertical',
                            sizes: [heightToPut + 'px'],
                            minSize: [5, minSize],
                            snapOffset: 10,
                            gutterSize: 5,
                            onDragEnd: function onDragEnd() {
                                var newPercent = $('#ServiceListTopContainer').height() / heightParent.height();
                                newPercent *= 100;
                                userSettingsManager.SetUserSettingsProperty('Services_List_Height_Percentage__c', newPercent);
                            }
                        });
                    }
                }, 0);
            }
        });

        // check what is the deault panel on the left
        if (userSettingsManager.GetUserSettingsProperty('DefaultLeftPanel__c') === 'territories' && userSettingsManager.GetUserSettingsProperty('locations').length) {
            LeftSideLocationFilteringService.open();
        }

        // ---------------- NEW FILTERS AREA ------------------

        if (useNewFilters) {
            GanttFilterService.filtersPromise.then(function (ganttFilters) {

                // support some old filters
                var oldFilters = [];

                $scope.filterOptions.forEach(function (f) {

                    // let oldFilter = Object.assign({} , f, {
                    //     Name: f.name,
                    //     old: true,
                    //     Id: f.value
                    // });

                    var oldFilter = {};

                    for (var k in f) {
                        oldFilter[k] = f[k];
                    }

                    oldFilter.Name = f.name;
                    oldFilter.old = true;
                    oldFilter.Id = f.value;

                    oldFilters.push(oldFilter);
                });

                $scope.filterOptions = [].concat(oldFilters, _toConsumableArray(ganttFilters));
                $scope.filtersMap = {};
                $scope.filterOptions.forEach(function (f) {
                    return $scope.filtersMap[f.Id] = f;
                });
            }).finally(function () {
                $scope.filterOptions.sort(function (a, b) {
                    if (a.Name > b.Name) {
                        return 1;
                    }
                    if (a.Name < b.Name) {
                        return -1;
                    }
                    return 0;
                });

                GanttFilterService.setFilterMap($scope.filtersMap);
            });
        }

        window.__closeFilterLightbox = function (id) {

            utils.safeApply($scope, function () {

                var close = GeneralLightbox.closeLightboxFromOutside();
                close && close();

                // something went wrong
                if (!id) {
                    return;
                }

                GanttFilterService.getFilterFromSalesforce(id).then(function (filter) {

                    if ($scope.filtersMap[filter.Id]) {

                        for (var i = 0; i < $scope.filterOptions.length; i++) {
                            if ($scope.filterOptions[i].Id === filter.Id) {
                                $scope.filterOptions[i] = filter;
                                break;
                            }
                        }
                    } else {

                        $scope.filterOptions.push(filter);
                        $scope.filterOptions.sort(function (a, b) {
                            if (a.Name > b.Name) {
                                return 1;
                            }
                            if (a.Name < b.Name) {
                                return -1;
                            }
                            return 0;
                        });
                    }

                    $scope.filtersMap[filter.Id] = filter;
                });
            });
        };

        $scope.openGanttFilterLightbox = function (mode) {

            var filter = $scope.filtersMap[$scope.filter.selectedFilter];

            switch (mode) {

                case 'new':
                    GeneralLightbox.open(customLabels.FilterEditor, filterEditorPage);break;

                case 'edit':
                    GeneralLightbox.open(customLabels.FilterEditor, filterEditorPage + '?&id=' + filter.Id);
                    break;

                case 'delete':

                    if (!confirm(customLabels.ConfirmFilterDelete)) {
                        return;
                    }

                    GanttFilterService.deleteFilter(filter.Id).then(handleDeleteHide);
                    break;

                case 'hide':

                    if (!confirm(customLabels.ConfirmFilterHide)) {
                        return;
                    }

                    GanttFilterService.hideFilter(filter.Id).then(handleDeleteHide);
                    break;
            }
        };

        function handleDeleteHide(id) {

            delete $scope.filtersMap[id];

            var foundIndex = -1;

            for (var i = 0; i < $scope.filterOptions.length; i++) {
                if ($scope.filterOptions[i].Id === id) {
                    foundIndex = i;
                    break;
                }
            }

            if (foundIndex !== -1) {
                $scope.filterOptions.splice(foundIndex, 1);
            }

            $scope.filter.selectedFilter = 'All';

            if (userSettingsManager.GetUserSettingsProperty('Selected_List_View__c') !== $scope.filter.selectedFilter) {
                userSettingsManager.SetUserSettingsProperty('Selected_List_View__c', $scope.filter.selectedFilter);
            }
        }

        $scope.showNewFilterButton = function () {
            return customPermissions.Create_custom_Gantt_filters;
        };

        $scope.showEditFilterButton = function () {

            if (!$scope.filtersMap) {
                return false;
            }

            var filter = $scope.filtersMap[$scope.filter.selectedFilter];

            // not found or OOTB, can't edit
            if (!filter || filter.old) {
                return false;
            }

            // edit personal
            if (customPermissions.Create_custom_Gantt_filters && !customPermissions.Publish_custom_Gantt_filters && filter.CreatedById === userId) {
                return true;
            }

            // edit public
            if (customPermissions.Publish_custom_Gantt_filters) {
                return true;
            }

            return false;
        };

        $scope.showDeleteFilterButton = function () {

            if (!$scope.filtersMap) {
                return false;
            }

            var filter = $scope.filtersMap[$scope.filter.selectedFilter];

            // not found or OOTB, can't edit
            if (!filter || filter.old) {
                return false;
            }

            // delete personal/public
            return customPermissions.Create_custom_Gantt_filters && filter.CreatedById === userId;
        };

        $scope.showHideFilterButton = function () {

            if (!$scope.filtersMap) {
                return false;
            }

            var filter = $scope.filtersMap[$scope.filter.selectedFilter];

            // not found or OOTB, can't edit
            if (!filter || filter.old) {
                return false;
            }

            // hide personal/public
            return customPermissions.Publish_custom_Gantt_filters && customPermissions.Create_custom_Gantt_filters;
        };

        function getTimePhasedObjectsWhenFilterChanged() {

            if (!$scope.filtersMap) {
                return false;
            }

            var filter = $scope.filtersMap[$scope.filter.selectedFilter];

            // not found or OOTB, can't edit
            if (!filter || filter.old) {
                return false;
            }

            var start = new Date($scope.filter.endDate),
                end = new Date($scope.filter.endDate);

            if ($scope.filter.endDate.toString() === 'Invalid Date') {
                start = new Date(scheduler._max_date), end = new Date(scheduler._max_date);
            }

            if (filter.List_only_appointments_on_the_gantt) {
                start = scheduler._min_date;
                end = scheduler._max_date;
            } else {
                start.setDate(start.getDate() - filter.Days_before_horizon - 1);
                end.setDate(end.getDate() + filter.Days_after_horizon);
            }

            var horizon = Math.ceil((end - start) / 1000 / 60 / 60 / 24);

            var servicesIdsToCheckRules = [];
            callLoadServicesInBulk(end, horizon, servicesIdsToCheckRules);
        }

        $scope.newFilterChanged = function () {

            // TODO : Ask ori if here with timeout is OK and what about the services search
            if ($scope.filterOptions[$scope.filterOptions.length - 1].Id === "SearchOnServer") {
                return;
            }

            if ($scope.filter.selectedFilter.Id !== "SearchOnServer" && $scope.filterOptions[$scope.filterOptions.length - 1].Id === "SearchOnServer") {
                $scope.filterOptions.pop();
            }

            // old filters
            if (!useNewFilters) {
                $scope.loadServiceAppointmentsToList();
                return;
            }

            if (!$scope.filtersMap) {
                return false;
            }

            var filter = $scope.filtersMap[$scope.filter.selectedFilter] || $scope.filtersMap.All;

            if (!$scope.filtersMap[$scope.filter.selectedFilter]) {
                $scope.filter.selectedFilter = 'All';
                filter.selectedFilter = 'All';
            }

            if (userSettingsManager.GetUserSettingsProperty('Selected_List_View__c') !== $scope.filter.selectedFilter) {
                userSettingsManager.SetUserSettingsProperty('Selected_List_View__c', $scope.filter.selectedFilter);
            }

            // not found or OOTB, can't edit
            if (!filter || filter.old) {
                $scope.loadServiceAppointmentsToList();
                return;
            }

            getTimePhasedObjectsWhenFilterChanged();
        };

        $scope.fieldsTypes = utils.fieldsTypes;
        $scope.openConsoleTab = utils.openConsoleTab;
        $scope.useNewFilters = window.useNewFilters;
        $scope.isMapEnabled = StateService.isMapEnabled();
        $scope.contractorSupport = StateService.areContractorsSupported();
        $scope.statuses = SERVICE_STATUS;
        $scope.statusCategory = SERVICE_CATEGORY;
        $scope.statusTranslations = utils.statusTranslations;
        $scope.pinnedStatusesSF = CustomSettings.pinnedStatusesSF;
        $scope.ganttSettings = utils.ganttSettings;
        $scope.showServiceList = utils.showServiceList;
        $scope.hasCustomPermission = utils.hasCustomPermission;
        $scope.isLightning = utils.isLightning;
        $scope.loadingServicesToList = 0;
        $scope.isServicePreviewAvailable = false;

        // settings
        $scope.isOptimizationEnabled = isOptimizationEnabled;
        $scope.bulkActionsOrder = bulkActionsOrder;
        $scope.isInConsole = StateService.isInConsole;
        $scope.matchGantt = userSettingsManager.GetUserSettingsProperty('Match_Gantt_Dates__c');
        $scope.fullScreen = false;
        if (window.location.search.match(/[&?]fullScreen=(\d)/)) $scope.fullScreen = window.location.search.match(/[&?]fullScreen=(\d)/)[1] === '1' ? '0' : '1';

        // service appointments
        $scope.servicesObjects = TimePhasedDataService.serviceAppointments;
        $scope.selectedServiceId = null;
        $scope.lastSelectedServiceId = null;
        $scope.servicesListVisitedDays = {};
        $scope.servicesListInited = false;
        var allfieldsSetFieldsObject = {},
            allfieldsSetFieldsObjectOneLevel = [];
        $scope.flagged = servicesService.flagged;
        $scope.loadedTerritories = [];

        // select service appointments ($scope.selectorService holds all selecting functions)
        $scope.selectorService = ServiceSelectorService;
        $scope.servicesSelection = $scope.selectorService.SelectedServices;

        // policy
        $scope.selectedPolicy = null;
        $scope.policyOptions = [];
        $scope.showGanttSettings = false; // lightbox, not a menu
        $scope.ganttSettingDraft = null;
        $scope.hours24 = [24, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
        $scope.reallyHideList = false;
        $scope.showAdvancedFilter = false;
        $scope.invokedAction = {}; // type of action running
        $scope.invokedActionFor = {}; // active actions running
        $scope.showCustomFilterDropdown = false;
        $scope.storageFilters = null;
        $scope.prevEndDate = null;

        $scope.sortingColumn = 'start';
        $scope.sortingColumnName = {
            start: customLabels.Start_time,
            finish: customLabels.Finish_time,
            accountName: customLabels.Account,
            serviceTypeName: customLabels.Service_type,
            priority: customLabels.Priority,
            resourceName: customLabels.Resource,
            earlyStart: customLabels.Early_start,
            dueDate: customLabels.Due_date,
            locationName: customLabels.Location
        };

        //for advanced filter
        $scope.selectedDates = {
            earlyStart: customLabels.Early_start,
            dueDate: customLabels.Due_date,
            appStart: customLabels.Appointment_start,
            appEnd: customLabels.Appointment_finish,
            start_date: customLabels.Start,
            end_date: customLabels.Finish
        };

        //filters
        $scope.filter = servicesService.filter;
        $scope.orderByField = servicesService.filter.orderByField;
        $scope.reverse = servicesService.filter.reverse;
        $scope.filteredServices = servicesService.filteredServices;
        $scope.filterOptions = [];

        if (utils.hasCustomPermission('Service_List_Todo')) $scope.filterOptions.push({ name: customLabels.Todo, value: 'Todo' });

        $scope.filterOptions.push({ name: customLabels.AllServices, value: 'All' });
        $scope.filterOptions.push({ name: customLabels.Recently_used, value: 'Recent' });

        if (utils.hasCustomPermission('Service_List_Flagged')) $scope.filterOptions.push({ name: customLabels.Flagged, value: 'Flagged' });
        if (utils.hasCustomPermission('Service_List_Selected')) $scope.filterOptions.push({ name: customLabels.Selected_Capital, value: 'Selected' });
        if (utils.hasCustomPermission('Service_List_Unscheduled')) $scope.filterOptions.push({ name: customLabels.UnscheduledCapital, value: 'Unscheduled' });
        if (utils.hasCustomPermission('Service_List_Scheuled')) $scope.filterOptions.push({ name: customLabels.Scheduled, value: 'Scheduled' });
        if (utils.hasCustomPermission('Service_List_In_Jeopardy')) $scope.filterOptions.push({ name: customLabels.In_Jeopardy, value: 'inJeopardy' });
        if (utils.hasCustomPermission('Service_List_Rule_Violating')) $scope.filterOptions.push({ name: customLabels.Rules_violating, value: 'Violating' });
        if (utils.hasCustomPermission('Service_List_Gantt')) $scope.filterOptions.push({ name: customLabels.Gantt, value: 'Gantt filter' });
        if (utils.hasCustomPermission('Service_List_Canceled')) $scope.filterOptions.push({ name: customLabels.Cancelled, value: 'Cancelled filter' });

        if (StateService.areContractorsSupported() && utils.hasCustomPermission('Service_List_Contractors')) {
            $scope.filterOptions.push({ name: customLabels.Contractors, value: 'Contractors filter' });
        }

        if (StateService.areCrewsSupported() && utils.hasCustomPermission('Service_List_Crews')) {
            $scope.filterOptions.push({ name: customLabels.crews, value: 'Crews filter' });
        }

        if (BundleService.isActive() && utils.hasCustomPermission('Service_List_Exclude_Bundle_Members')) {
            $scope.filterOptions.push({ name: customLabels.Exclude_Bundle_Members_Filter, value: 'Exclude Bundle Members' });
        }

        // field sets
        FieldSetFieldsService.fieldsSetFields().then(function (fieldsSetFieldsObject) {

            allfieldsSetFieldsObject = fieldsSetFieldsObject;

            if (Array.isArray(fieldsSetFieldsObject.servicePreview) && fieldsSetFieldsObject.servicePreview.length > 0) {
                $scope.isServicePreviewAvailable = true;
            }

            for (var key in fieldsSetFieldsObject) {

                fieldsSetFieldsObject[key].forEach(function (field) {
                    allfieldsSetFieldsObjectOneLevel[field.FullAPIName] = field;
                });
            }

            $scope.clickedServiceFieldPairs = [];

            for (var i = 0; i < fieldsSetFieldsObject['ListExpanded'].length;) {

                var j = i + 2,
                    currList = [];

                for (; i < fieldsSetFieldsObject['ListExpanded'].length && i < j; i++) {
                    currList.push(fieldsSetFieldsObject['ListExpanded'][i]);
                }

                $scope.clickedServiceFieldPairs.push(currList);
            }
        });

        // which fields to display on the coluns
        $scope.getColumnsToDisplay = function () {

            var filter = GanttFilterService.getFilterById($scope.filter.selectedFilter);

            if (filter && filter.Displayed_Fields && filter.Displayed_Fields.length > 0) {

                var display = [];
                filter.Displayed_Fields.forEach(function (fieldName) {
                    if (allfieldsSetFieldsObjectOneLevel[fieldName]) display.push(allfieldsSetFieldsObjectOneLevel[fieldName]);
                });

                return display;
            }

            return allfieldsSetFieldsObject.ListColumns;
        };

        $scope.getSingleTaskColumnClass = function (field) {
            var obj = {
                SingleTaskColumn: true,
                truncate: true
            };

            obj['Field-' + field.Type] = true;

            return obj;
        };

        $scope.getHeaderTaskColumnClass = function (field) {
            var obj = {
                SortingTasksListColumn: true
            };

            obj['Field-' + field.Type] = true;

            return obj;
        };

        function callLoadServicesInBulk(endDate, backHorizon, servicesIdsToCheckRules) {
            var offsetId = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;


            if (offsetId === null) {
                callLoadServicesInBulk.loadedSoFar = 0;
            }

            if (callLoadServicesInBulk.loadedSoFar >= maxNumberOfServicesToLoad) {
                utils.addNotification(customLabels.Too_Many_Services_Header_Services_List, customLabels.Too_Many_Services_Services_List);
                callLoadServicesInBulk.loadedSoFar = 0;
                return;
            }

            $scope.loadingServicesToList++;

            LoadServiceListService.loadServicesInBulk($scope.servicesObjects(), $scope.servicesListVisitedDays, endDate, backHorizon, offsetId).then(function (services) {

                // retrieved amount of services is the same as what we are allowed to load, need to make another call
                if (services.totalFetched === numberOfServicesToLoadInEachBulk) {

                    callLoadServicesInBulk.loadedSoFar += services.totalFetched;

                    // add to check rules only if not already on the gantt (if on gantt, it was retrived from getTimePhasedObject)
                    servicesIdsToCheckRules.push.apply(servicesIdsToCheckRules, _toConsumableArray(services.needToCheckRules));

                    callLoadServicesInBulk(endDate, backHorizon, servicesIdsToCheckRules, services.lastFetchedId);
                }

                // finished getting services to list
                else if (services.scheduledServices) {

                        // check rules for the services we got, if NEEDED (list not empty + mode = 'Always')
                        servicesIdsToCheckRules.push.apply(servicesIdsToCheckRules, _toConsumableArray(services.needToCheckRules));
                        servicesIdsToCheckRules.length > 0 && window.__gantt.checkRulesMode === 'Always' && servicesService.checkRules(servicesIdsToCheckRules).then(servicesService.drawViolationsOnGantt);
                    }
                if (window.splunkLoggingFinestFlagEnabled && firstLoadForSplunk) {
                    var totalServicesOnGantt = callLoadServicesInBulk.loadedSoFar + services.totalFetched;
                    firstLoadForSplunk = false;
                    sfdcService.callRemoteAction(RemoteActions.sendDataToSplunk, 'serviceListCount', null, null, null, totalServicesOnGantt, null);
                }
            }).catch(function (ex) {
                console.warn('loadServiceAppointmentsToList failed ' + ex);
            }).finally(function () {
                return $scope.loadingServicesToList--;
            });
        }

        // load service appointments to service list from server
        $scope.loadServiceAppointmentsToList = function () {
            callLoadServicesInBulk($scope.endDate, utils.ganttSettings.backHorizon, []);
        };

        $scope.formatServiceField = function (service, field) {
            var res = service[field.APIName];

            switch (field.Type) {
                case utils.fieldsTypes.DateTime:
                    res = $filter('amDateFormat')(res, 'lll');
                    break;
                case utils.fieldsTypes.Date:
                    res = $filter('amDateFormat')(res, 'L');
                    break;
            }

            return res;
        };

        $scope.getRefFieldID = function (service, field) {
            return service[field.JsAPIName.replace('__r', '__c')];
        };

        $scope.isFieldEmpty = function (service, field) {
            return typeof $filter('displayFieldSetField')(service, field) === 'undefined';
        };

        $scope.openCalendarAdvanceFilterStart = function () {
            if ($scope.IsCustomFilterReadonly) return;
            if (scheduler.isCalendarVisible()) {
                scheduler.destroyCalendar();
            } else {
                scheduler.renderCalendar({
                    position: 'calendarMin',
                    date: new Date($scope.filter.endDate),
                    navigation: true,
                    handler: function handler(date, calendar) {
                        utils.safeApply($scope, function () {
                            if (date > new Date($scope.filter.advancedFilter.maxDate)) {
                                alert(customLabels.startBeforeEnd);
                            } else {
                                $scope.filter.advancedFilter.minDate = date;
                            }
                        });

                        scheduler.destroyCalendar();
                    }
                });
            }
        };

        $scope.openCalendarAdvanceFilterFinish = function () {
            if ($scope.IsCustomFilterReadonly) return;
            if (scheduler.isCalendarVisible()) {
                scheduler.destroyCalendar();
            } else {
                scheduler.renderCalendar({
                    position: 'calendarMax',
                    date: new Date($scope.endDate),
                    navigation: true,
                    handler: function handler(date, calendar) {
                        utils.safeApply($scope, function () {
                            if (date < new Date($scope.filter.advancedFilter.minDate)) {
                                alert(customLabels.startBeforeEnd);
                            } else {
                                $scope.filter.advancedFilter.maxDate = date;
                            }
                        });

                        scheduler.destroyCalendar();
                    }
                });
            }
        };

        $scope.openCalendarAdvanceFilterStart = function () {
            if ($scope.IsCustomFilterReadonly) return;
            if (scheduler.isCalendarVisible()) {
                scheduler.destroyCalendar();
            } else {
                scheduler.renderCalendar({
                    position: 'calendarMin',
                    date: new Date($scope.filter.endDate),
                    navigation: true,
                    handler: function handler(date, calendar) {
                        utils.safeApply($scope, function () {
                            if (date > new Date($scope.filter.advancedFilter.maxDate)) {
                                alert(customLabels.startBeforeEnd);
                            } else {
                                $scope.filter.advancedFilter.minDate = date;
                            }
                        });

                        scheduler.destroyCalendar();
                    }
                });
            }
        };

        // get policies
        StateService.promises.policies().then(function (policies) {

            $scope.policyOptions = policies;

            var foundDefault = false,
                userSettingPolicy = userSettingsManager.GetUserSettingsProperty('Gantt_Policy__c');

            for (var i = 0; i < policies.length; i++) {
                if (userSettingPolicy) {
                    if (policies[i].Id === userSettingPolicy) {
                        $scope.selectedPolicy = policies[i];
                        foundDefault = true;
                        break;
                    }
                } else {
                    if (policies[i].Id === defaultPolicy) {
                        $scope.selectedPolicy = policies[i];
                        foundDefault = true;
                        break;
                    }
                }
            }

            if (!foundDefault) {
                $scope.selectedPolicy = $scope.policyOptions[0];
            }

            StateService.selectedPolicyId = $scope.selectedPolicy.Id;
        }).catch(function (err) {
            console.warn(err);
            cantLoadGantt(customLabels.no_policy_found);
        });

        // show global check rules button only if user has CP
        $scope.showGlobalCheckRules = function () {
            return window.customPermissions.Enable_Check_Rules_For_All_Services;
        };

        $scope.checkRulesForAllServices = function () {

            // check rules only if we are NOT on "Always" mode
            if (window.__gantt.checkRulesMode === 'Always') {
                return;
            }

            // get all ids
            var ids = [];

            for (var key in scheduler._events) {
                scheduler._events[key].type === 'service' && ids.push(key);
            }

            // check rules only if we are on "Always" mode
            if (ids.length > 0) {
                servicesService.checkRules(ids).then(servicesService.drawViolationsOnGantt);
            }
        };

        // set policy globally
        $scope.changePolicy = function () {

            StateService.selectedPolicyId = $scope.selectedPolicy.Id;
            userSettingsManager.SetUserSettingsProperty('Gantt_Policy__c', $scope.selectedPolicy.Id);

            // check rules only if we are on "Always" mode
            if (window.__gantt.checkRulesMode !== 'Always') {
                return;
            }

            // get all ids
            var ids = [];
            for (var key in scheduler._events) {
                scheduler._events[key].type === 'service' && ids.push(key);
            }

            if (ids.length > 0) {
                servicesService.checkRules(ids).then(servicesService.drawViolationsOnGantt);
            }
        };

        $scope.policySelectorDisabled = function () {

            // if ignoring - not disable (return false to ngDisable) --- OR --- not ignoring and doesn't have CP
            if (!window.__gantt.ignoreReadonlyGantt226 && !window.customPermissions.Enable_Gantt_Policy_Picker) {
                return true;
            }

            return $scope.policyOptions.length === 0;
        };

        $scope.order = function (predicate, reverse) {
            $scope.filter.orderByField = predicate;
            $scope.filter.reverse = reverse;
        };

        $scope.selectService = function (srvId) {
            if (srvId === $scope.selectedServiceId) {
                $scope.selectedServiceId = null;
                $scope.lastSelectedServiceId = srvId;
            } else {
                $scope.lastSelectedServiceId = $scope.selectedServiceId;
                $scope.selectedServiceId = srvId;
            }
        };

        $scope.violationsTooltip = function (s) {
            if (!s.violations && !s.jeopardy) {
                if (BundleService.isBundleMember(s)) {
                    return customLabels.BundleMemberToolTip;
                }
                if (BundleService.isBundle(s)) {
                    return customLabels.BundleToolTip;
                }
                if (s.isMDT) {
                    return customLabels.Multi_Day_Service;
                }
            }

            if (!s.violations && !s.jeopardy) return;

            if (s.jeopardy && s.jeopardyReason) return s.jeopardyReason;

            if (!s.violations) return;

            var violations = '';

            for (var i = 0; i < s.violations.length; i++) {
                violations += s.violations[i].RuleName + '\n';
            }if (violations) violations = violations.substring(0, violations.length - 1);

            return violations;
        };

        // return class name to fit the service status/jeopardy/violation
        $scope.getStatusClass = function (srv) {
            return utils.getCSSClassForContext(srv.statusCategory, SERVICE_CATEGORY);
        };

        $scope.$on('initCompleted', function (event) {

            //StateService.setDeltaDates(scheduler.getState().min_date, getSchedulerMaxDate());

            $scope.initEndDate();

            var filteredLocations = userSettingsManager.GetUserSettingsProperty('locations');
            $scope.territories = [];

            for (var i = 0; i < filteredLocations.length; i++) {
                if (ResourcesAndTerritoriesService.territories()[filteredLocations[i]] !== undefined) {
                    $scope.territories.push(ResourcesAndTerritoriesService.territories()[filteredLocations[i]]);
                }
            }

            addStorageFiltersToList();
        });

        $scope.initEndDate = function () {
            $scope.endDate = getSchedulerMaxDate();
            if (!$scope.matchGantt) $scope.endDate = utils.addDaysToDate($scope.endDate, 1);
            $scope.prevEndDate = $scope.endDate;
            $scope.filter.endDate = $scope.endDate;

            $scope.horizonDateChanged();
        };

        $scope.horizonDateChanged = function () {
            if (!moment($scope.filter.endDate).isValid()) return;

            var dateWithBackHorizon = utils.addDaysToDate($scope.filter.endDate, -utils.ganttSettings.backHorizon);
            StateService.setDeltaDates(dateWithBackHorizon, $scope.filter.endDate);
        };

        $scope.$on('ganttFinishedLoadingServices', function () {

            if ($scope.matchGantt || $scope.servicesListInited === false) {
                if (!$scope.servicesListInited) {
                    if ($scope.endDate === null || isNaN($scope.endDate.getTime())) {
                        $scope.initEndDate();
                    }
                }

                $scope.servicesListInited = true;
                $scope.newFilterChanged();
            }
        });

        function getSchedulerMaxDate() {

            var newDT = scheduler.getState().max_date;

            if (newDT.getHours() === 0 && newDT.getMinutes() === 0) {
                newDT = new Date(newDT.getTime() - 60000);
            } else {
                newDT.setHours(23);
                newDT.setMinutes(59);
                newDT.setSeconds(0);
            }

            return newDT;
        }

        scheduler.attachEvent("onBeforeViewChange", function (old_mode, old_date) {
            scheduler._old = { mode: old_mode, date: old_date };
            return true;
        });

        var firstCallToLoadToListWithMatchGantt = true;

        scheduler.attachEvent('onViewChange', function (new_mode, new_date) {

            if (scheduler._old.mode === new_mode && new_date === scheduler._old.date && scheduler._mode !== 'LongView' && scheduler._mode !== 'MonthlyView') {
                return;
            }

            if (StateService.isLoadingNewLocations) {
                return;
            }

            StateService.setDeltaDates(scheduler.getState().min_date, getSchedulerMaxDate());

            utils.safeApply($scope, function () {
                if ($scope.matchGantt) {
                    var newDT = getSchedulerMaxDate();

                    $scope.filter.endDate = newDT;
                    $scope.endDate = newDT;

                    if ($scope.matchGantt && !firstCallToLoadToListWithMatchGantt) {
                        $scope.newFilterChanged();
                    } else {
                        firstCallToLoadToListWithMatchGantt = false;
                    }
                }
            });
        });

        $scope.matchGanttClicked = function () {

            // W-8618132
            if (!$scope.matchGantt) {
                $scope.prevEndDate = $scope.endDate;
                $scope.filter.endDate = getSchedulerMaxDate();
                $scope.endDate = $scope.filter.endDate;
                userSettingsManager.SetUserSettingsProperty('Match_Gantt_Dates__c', true);
            } else {

                var d = $scope.prevEndDate;

                if (d.toString() === 'Invalid Date') {
                    d = scheduler._min_date;
                }

                $scope.filter.endDate = d;
                $scope.endDate = d;
                userSettingsManager.SetUserSettingsProperty('Match_Gantt_Dates__c', false);
            }

            $scope.newFilterChanged();
        };

        $scope.openLightBox = function (serviceId) {
            servicesService.recentlyUsed[serviceId] = true;
            ServiceAppointmentLightboxService.open(serviceId);
        };

        $scope.flagging = function (id) {
            if (!servicesService.flagged[id]) {
                servicesService.flagged[id] = true;
                scheduler.updateEvent(id);
                return;
            }

            if (servicesService.flagged[id]) {
                servicesService.flagged[id] = !servicesService.flagged[id];
                scheduler.updateEvent(id);
            }
        };

        $scope.showOnGantt = function (service) {

            servicesService.recentlyUsed[service.id] = true;
            var serviceNotLoaded = false;
            if (service) {
                /// Bundler might change the task to show to parent bundle
                service = BundleService.verifyShowSaOnGantt(service);
                if (service) {
                    servicesService.recentlyUsed[service.id] = true;
                } else {
                    serviceNotLoaded = true;
                }
            }
            if (serviceNotLoaded || !scheduler._events[service.id]) {
                alert(customLabels.location_not_loaded);
            } else {
                if ($('#GanttMapContainer').css('display') === 'none') {
                    $rootScope.$broadcast('changeWorkingState', 'gantt');
                    $timeout(function () {
                        updateViewDebounced();
                    }, 20);

                    $timeout(function () {
                        utils.showOnGantt(service.id);
                    }, 120);
                } else {
                    utils.showOnGantt(service.id);
                }
            }
        };

        $scope.changeStatusToDispatch = function (serviceId) {
            if ($scope.invokedActionFor[serviceId] || StateService.schedulingRunningFor[serviceId]) {
                alert(customLabels.another_operation_running);
                return;
            }

            servicesService.recentlyUsed[serviceId] = true;
            $scope.invokedAction[serviceId] = 'dispatch';
            $scope.invokedActionFor[serviceId] = true;

            var servicesArray = [serviceId];

            servicesService.changeStatus(servicesArray, SERVICE_STATUS.DISPATCHED).then(function (resultObjects) {
                servicesService.drawServicesAndAbsences(resultObjects.services);
                $scope.invokedAction[serviceId] = null;
                $scope.invokedActionFor[serviceId] = false;
            }).catch(function (err) {
                utils.addNotification(customLabels.Service_Appointment_Update_ErrorMsgTitle, err.message);
            }).finally(function () {
                $scope.invokedAction[serviceId] = null;
                $scope.invokedActionFor[serviceId] = false;
            });
        };

        $scope.showOnMap = function (serviceId) {
            $rootScope.$broadcast('showServiceOnMap', serviceId);
        };

        $scope.shouldShowQuickActionBtn = function (actionName, service) {
            return listQuickActionsService.shouldShowQuickActionBtn(actionName, service);
        };

        $scope.bundleSA = function (service) {
            if (!BundleActions.Bundle.canInvoke([service])) return;

            if ($scope.invokedActionFor[service.id]) {
                alert(customLabels.another_operation_running);
                return;
            }

            servicesService.recentlyUsed[service.id] = true;
            $scope.invokedAction[service.id] = 'bundle';
            $scope.invokedActionFor[service.id] = true;

            BundleActions.Bundle.invoke([service]).then(function () {}).catch(function (ex) {}).finally(function () {
                $scope.invokedAction[service.id] = null;
                $scope.invokedActionFor[service.id] = false;
            });
        };

        $scope.unbundleSA = function (service) {
            if (!BundleActions.Unbundle.canInvoke([service])) return;

            if ($scope.invokedActionFor[service.id]) {
                alert(customLabels.another_operation_running);
                return;
            }

            servicesService.recentlyUsed[service.id] = true;
            $scope.invokedAction[service.id] = 'unbundle';
            $scope.invokedActionFor[service.id] = true;

            BundleActions.Unbundle.invoke([service]).then(function () {}).catch(function (ex) {}).finally(function () {
                $scope.invokedAction[service.id] = null;
                $scope.invokedActionFor[service.id] = false;
            });
        };

        $scope.openDateEndCalendar = function () {
            if ($scope.matchGantt || $scope.filter.selectedFilter == 'Recent' || $scope.filter.selectedFilter == 'Flagged' || $scope.filter.selectedFilter == 'Selected' || $scope.filter.selectedFilter == 'Gantt Filter') return;

            if (scheduler.isCalendarVisible()) {
                scheduler.destroyCalendar();
            } else {
                scheduler.renderCalendar({
                    position: 'DateStart',
                    date: new Date($scope.filter.endDate),
                    navigation: true,
                    handler: function handler(date, calendar) {
                        utils.safeApply($scope, function () {
                            $scope.endDate = date;
                            $scope.endDate.setHours(23);
                            $scope.endDate.setMinutes(59);
                            $scope.endDate.setSeconds(0);
                            $scope.filter.endDate = $scope.endDate;

                            $scope.horizonDateChanged();

                            $scope.newFilterChanged();
                        });

                        scheduler.destroyCalendar();
                    }
                });
            }
        };

        $scope.openFullScreen = function () {

            var isFullParamSet = window.location.search.match(/[&?]fullScreen=(\d)/),
                fullScreen = 0;

            if (!isFullParamSet) {
                window.location.search += '&fullScreen=1';
                fullScreen = 1;
            } else {
                var newParam = isFullParamSet[1] === '1' ? '0' : '1';
                window.location.search = window.location.search.replace(/[&?]fullScreen=\d/, '&fullScreen=' + newParam);
            }
        };

        $scope.getSlots = function (serviceId) {
            servicesService.recentlyUsed[serviceId] = true;

            // change to gantt (we might be on the map)
            if ($('#GanttMapContainer').css('display') === 'none') {
                $rootScope.$broadcast('changeWorkingState', 'gantt');
                setTimeout(function () {
                    updateViewDebounced();
                }, 20);
            }

            if ($scope.invokedActionFor[serviceId] || StateService.schedulingRunningFor[serviceId]) {
                alert(customLabels.another_operation_running);
                return;
            }

            GetSlotsService.get(serviceId);
        };

        $scope.scheduleAndReshuffle = function (serviceId) {
            if ($scope.invokedActionFor[serviceId]) {
                alert(customLabels.another_operation_running);
                return;
            }

            servicesService.recentlyUsed[serviceId] = true;
            $scope.invokedAction[serviceId] = 'reshuffle';
            $scope.invokedActionFor[serviceId] = true;

            sfdcService.callRemoteAction(RemoteActions.runReshuffle, serviceId, StateService.selectedPolicyId).then(function (optReq) {

                DeltaService.updateOptimizationRequest(optReq);

                var deltaCallback = function deltaCallback(requests) {
                    requests.forEach(function (req) {

                        var newRequest = new OptimizationRequest(req);

                        if (newRequest.id === optReq.Id && (newRequest.status === 'Completed' || newRequest.status === 'Failed')) {
                            $scope.invokedAction[serviceId] = null;
                            $scope.invokedActionFor[serviceId] = false;

                            RegisterService.unRegister('optimizationRequests', deltaCallback);
                        }
                    });
                };

                RegisterService.register('optimizationRequests', deltaCallback);
            }, function (err) {
                utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err.message);
                $scope.invokedAction[serviceId] = null;
                $scope.invokedActionFor[serviceId] = false;
            });
        };

        $scope.groupNearby = function (serviceId) {
            if ($scope.invokedActionFor[serviceId]) {
                alert(customLabels.another_operation_running);
                return;
            }

            servicesService.recentlyUsed[serviceId] = true;
            $scope.invokedAction[serviceId] = 'groupNearby';
            $scope.invokedActionFor[serviceId] = true;

            sfdcService.callRemoteAction(RemoteActions.runGroupNearby, serviceId, StateService.selectedPolicyId).then(function (optReq) {

                DeltaService.updateOptimizationRequest(optReq);

                var deltaCallback = function deltaCallback(requests) {
                    requests.forEach(function (req) {

                        var newRequest = new OptimizationRequest(req);

                        if (newRequest.id === optReq.Id && (newRequest.status === 'Completed' || newRequest.status === 'Failed')) {
                            $scope.invokedAction[serviceId] = null;
                            $scope.invokedActionFor[serviceId] = false;

                            RegisterService.unRegister('optimizationRequests', deltaCallback);
                        }
                    });
                };

                RegisterService.register('optimizationRequests', deltaCallback);
            }, function (err) {
                utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err.message);
                $scope.invokedAction[serviceId] = null;
                $scope.invokedActionFor[serviceId] = false;
            });
        };

        $scope.autoScheduleService = function (serviceId) {
            if ($scope.invokedActionFor[serviceId] || StateService.schedulingRunningFor[serviceId]) {
                alert(customLabels.another_operation_running);
                return;
            }

            servicesService.recentlyUsed[serviceId] = true;
            $scope.invokedAction[serviceId] = 'schedule';
            $scope.invokedActionFor[serviceId] = true;

            servicesService.autoScheduleService(serviceId).then(function (updatedObjects) {

                if (updatedObjects.services.length === 0) {
                    alert(customLabels.NoCandidates);
                }

                !updatedObjects.mst && servicesService.drawServicesAndAbsences(updatedObjects.services, updatedObjects.absences);
            }).catch(function (err) {
                utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err.message);
            }).finally(function () {
                $scope.invokedAction[serviceId] = null;
                $scope.invokedActionFor[serviceId] = false;
            });
        };

        $scope.$on('autoScheduleServiceFinished', function (e, id) {
            $scope.invokedAction[id] = null;
            $scope.invokedActionFor[id] = false;
        });

        $scope.openGanttSettings = function () {

            $scope.showGanttSettings = true;

            if (utils.ganttSettings) {
                $scope.ganttSettings = utils.ganttSettings;
            } else {
                $scope.ganttSettings.filterCandidates = true;
                $scope.ganttSettings.servicesPerPage = 200;
                $scope.ganttSettings.backHorizon = 14;
                $scope.ganttSettings.capacityDuration = 'Day';
            }

            $scope.ganttSettingDraft = angular.copy($scope.ganttSettings);

            setTimeout(function () {
                $('#ganttSettingsLightbox').draggable({ containment: 'document', handle: '#ganttSettingsLightboxHeader' });
                $('#ganttSettingsLightbox').children().find('input[type=checkbox]').first().focus();
            }, 500);
        };

        $scope.closeSettingsLightbox = function () {
            $scope.showGanttSettings = false;
            $('#ganttSettingsLightbox').attr('style', '');
            $scope.ganttSettingDraft = angular.copy($scope.ganttSettings);
        };

        $scope.parseGanttSettingsToUserSetting = function (legacyGanttSetting) {
            var parsedSettings = {};
            parsedSettings['Gantt_View_Start_Hour__c'] = legacyGanttSetting['startHour'];
            parsedSettings['Gantt_View_Finish_Hour__c'] = legacyGanttSetting['finishHour'];
            parsedSettings['Filter_Candidates__c'] = legacyGanttSetting['filterCandidates'];
            parsedSettings['Services_Per_Page__c'] = legacyGanttSetting['servicesPerPage'];
            parsedSettings['Resource_Row_Height__c'] = legacyGanttSetting['resourceRowHeight'];
            parsedSettings['Scheduling_horizon_limit__c'] = legacyGanttSetting['backHorizon'];
            parsedSettings['View_Capacity_Type__c'] = legacyGanttSetting['capacityDuration'];
            parsedSettings['Load_On_Today__c'] = legacyGanttSetting['loadOnToday'];
            parsedSettings['DefaultLeftPanel__c'] = legacyGanttSetting['leftPanel'];
            parsedSettings['ServiceListColoring__c'] = legacyGanttSetting['serviceColoring'];
            return parsedSettings;
        };

        $scope.saveGanttSettings = function () {

            if (typeof $scope.ganttSettingDraft.backHorizon === 'undefined') {
                alert(customLabels.backHorizonInvalid);
                return;
            }

            schedulerConfig.setRowHeights($scope.ganttSettingDraft.resourceRowHeight, true);
            setCapacityFilter($scope.ganttSettingDraft.capacityDuration, true);

            $scope.ganttSettings = angular.copy($scope.ganttSettingDraft);
            utils.ganttSettings = angular.copy($scope.ganttSettingDraft);

            $scope.filter.servicesPerPage = parseInt($scope.ganttSettings.servicesPerPage);
            // save to local storage
            userSettingsManager.SetUserSettingProperties($scope.parseGanttSettingsToUserSetting($scope.ganttSettings)).then(function () {
                $scope.loadServiceAppointmentsToList();
            });

            $scope.showGanttSettings = false;
        };

        // key press events
        $scope.$on('keypress', function (event, e) {
            if (e.which === 27) {
                $scope.closeSettingsLightbox();
            }
        });

        $scope.createArray = function (i, j) {

            if (typeof i !== 'number' || isNaN(i)) return [];

            if (typeof j !== 'number' || isNaN(j)) return [];

            var size = Math.floor(i / j);

            if (i % j > 0) size++;

            return new Array(size);
        };

        $scope.changePage = function (where) {
            switch (where) {
                case 'right':
                    if ($scope.filter.totalPages != $scope.filter.currentPage) {
                        //$scope.filter.currentPage++
                        $scope.filter.currentPage = parseInt($scope.filter.currentPage) + 1;
                        $scope.filter.currentPage = $scope.filter.currentPage.toString();
                    }

                    break;
                case 'left':
                    if ($scope.filter.currentPage > 1) {
                        //$scope.filter.currentPage--;
                        $scope.filter.currentPage = parseInt($scope.filter.currentPage) - 1;
                        $scope.filter.currentPage = $scope.filter.currentPage.toString();
                    }

                    break;
                case 'first':
                    if ($scope.filter.currentPage > 1) {
                        //$scope.filter.currentPage = 1;
                        $scope.filter.currentPage = '1';
                    }

                    break;
                case 'last':
                    if ($scope.filter.totalPages != $scope.filter.currentPage) {
                        $scope.filter.currentPage = $scope.filter.totalPages.toString();
                    }

                    break;
            }
        };

        $scope.hideServiceList = function () {

            $scope.showServiceList.show = false;
            $scope.reallyHideList = true;

            $timeout(function () {
                updateViewDebounced();
                $rootScope.$broadcast('resizeMap', {});
            }, 0); // the transition length is set on the CSS and is 0.8s
        };

        $scope.$watch('showServiceList.show', function (newVal, oldVal) {
            if (newVal) $scope.reallyHideList = false;
        });

        $scope.isDraggable = function (id) {

            // we are NOT ignoring and user has no CP
            if (!window.__gantt.ignoreReadonlyGantt226 && !window.customPermissions.Enable_Drag_And_Drop) {
                return false;
            }

            var service = $scope.servicesObjects()[id];

            if (!service) {
                return false;
            }

            // check if service is being saved right now
            if (scheduler._events[service.id + '_dummy']) {
                return false;
            }

            return !service.resourceId && service.statusCategory === SERVICE_CATEGORY.NONE && (!service.pinned || service.pinned && !preventUpdateOfPinned) && (!BundleService.isActive() || !BundleService.isBundleMember(service));
        };

        $scope.isBeingSavedNow = function (id) {
            return !!scheduler._events[id + '_dummy'];
        };

        $scope.showAdvancedFilterFunc = function () {
            $('#AdvancedFilteringOptions').css('display', 'block');
            $timeout(function () {
                $('#SmartPanelContainer').find('.gutter-vertical').hide();
                $scope.showAdvancedFilter = true;
            }, 100);
        };

        $scope.hideAdvancedFilterFunc = function () {
            $scope.showAdvancedFilter = false;
            setTimeout(function () {
                $('#SmartPanelContainer').find('.gutter-vertical').show();
                $('#AdvancedFilteringOptions').css('display', 'none');
            }, 700);
        };

        $scope.removeSpaces = function (str) {
            return str ? str.split(' ').join('+') : '';
        };

        function getStorageFilterByName(filterName, storageFilters) {

            for (var i = 0; i < storageFilters.length; i++) {
                if (storageFilters[i].name == filterName) {
                    return storageFilters[i].filter;
                }
            }

            return false;
        }

        $scope.filterChanged = function () {

            var storageFilter = getFiltersFromStorage(),
                filter = getStorageFilterByName($scope.filter.selectedFilter, storageFilter);

            if (filter) {
                $scope.filter.advancedFilter = filter;
                $scope.customFilterSelected = true;
                $scope.customFilterName = $scope.filter.selectedFilter;
            } else {
                $scope.customFilterSelected = false;
            }

            if (userSettingsManager.GetUserSettingsProperty('Selected_List_View__c') !== $scope.filter.selectedFilter) {
                userSettingsManager.SetUserSettingsProperty('Selected_List_View__c', $scope.filter.selectedFilter);
            }
        };

        $scope.$on('gotNewResources', function (e, locationsArr) {

            $scope.territories = [];
            var filteredLocations = locationsArr.show;

            for (var i = 0; i < filteredLocations.length; i++) {
                if (ResourcesAndTerritoriesService.territories()[filteredLocations[i]] !== undefined) {
                    $scope.territories.push(ResourcesAndTerritoriesService.territories()[filteredLocations[i]]);
                }
            }

            $scope.servicesListVisitedDays = {};

            $scope.newFilterChanged();
        });

        //----- custom filter ------//

        $scope.createCustomFilter = function () {
            $scope.isEditMode = false;
            $scope.customFilterName = '';
            $scope.displayCancel = true;
            $scope.IsCustomFilterReadonly = false;
            $scope.DisplayComboBowArrow = false;
            $scope.displayNew = false;
            $scope.displayEdit = false;
            $scope.displaySave = true;
            $scope.displayDelete = false;
            $scope.filter.advancedFilter = getDefaultEmptyFilter();
        };

        $scope.CancelSaveOrEditCustomFilter = function () {
            $scope.displayNew = true;
            $scope.displayEdit = true;
            $scope.DisplayComboBowArrow = true;
            $scope.displaySave = false;
            $scope.displayDelete = true;
            $scope.displayCancel = false;
            $scope.IsCustomFilterReadonly = true;

            setSelectedFilter($scope.lastSelectedFilter);
        };

        $scope.saveCustomFilter = function () {
            if ($scope.customFilterName.length === 0) {
                alert(customLabels.Please_give_a_name_to_the_custom_filter);
                return;
            }

            for (var j = 0; j < $scope.filterOptions.length; j++) {
                if (!$scope.isEditMode && $scope.filterOptions[j].name === $scope.customFilterName || $scope.isEditMode && $scope.filterOptions[j].name === $scope.customFilterName && $scope.filterOptions[j].name !== $scope.lastSelectedFilter) {
                    alert('Please select another name');
                    return;
                }
            }

            $scope.displayNew = true;
            $scope.displayEdit = true;
            $scope.DisplayComboBowArrow = true;
            $scope.displaySave = false;
            $scope.displayDelete = true;
            $scope.displayCancel = false;
            $scope.IsCustomFilterReadonly = true;

            if ($scope.isEditMode) {
                for (var i = 0; i < $scope.storageFilters.length; i++) {

                    if ($scope.storageFilters[i].name === $scope.lastSelectedFilter) {

                        $scope.storageFilters[i].filter = $scope.filter.advancedFilter;
                        $scope.storageFilters[i].name = $scope.customFilterName;

                        saveFilterToStorage();

                        for (var _j = 0; _j < $scope.filterOptions.length; _j++) {
                            if ($scope.filterOptions[_j].name === $scope.lastSelectedFilter) {
                                $scope.filterOptions[_j].name = $scope.customFilterName;
                                $scope.filterOptions[_j].value = $scope.customFilterName;

                                break;
                            }
                        }

                        if ($scope.filter.selectedFilter === $scope.lastSelectedFilter) $scope.filter.selectedFilter = $scope.customFilterName;

                        break;
                    }
                }
            } else {
                $scope.storageFilters.push({
                    name: angular.copy($scope.customFilterName),
                    filter: angular.copy($scope.filter.advancedFilter)
                });
                $scope.filterOptions.push({
                    name: angular.copy($scope.customFilterName),
                    value: angular.copy($scope.customFilterName)
                });

                saveFilterToStorage();
                $scope.customFilterSelected = true;
                $scope.filter.selectedFilter = $scope.customFilterName;
            }

            $scope.lastSelectedFilter = $scope.customFilterName;
        };

        $scope.EditCustomFilter = function () {
            $scope.isEditMode = true;
            $scope.displayCancel = true;
            $scope.DisplayComboBowArrow = false;
            $scope.displayNew = false;
            $scope.displayEdit = false;
            $scope.displaySave = true;
            $scope.displayDelete = false;

            $scope.IsCustomFilterReadonly = false;
            $scope.DisplayComboBowArrow = false;

            $scope.filter.advancedFilter = angular.copy($scope.filter.advancedFilter);
        };

        $scope.deleteCustomFilter = function () {
            $scope.IsCustomFilterReadonly = true;
            $scope.DisplayComboBowArrow = true;
            $scope.displayNew = true;
            $scope.displayEdit = true;
            $scope.displaySave = false;
            $scope.displayDelete = true;

            for (var i = 0; i < $scope.storageFilters.length; i++) {
                if ($scope.storageFilters[i].name === $scope.customFilterName) {
                    $scope.storageFilters.splice(i, 1);
                    break;
                }
            }

            deleteFilterFromFilterList($scope.customFilterName);
            saveFilterToStorage();

            if ($scope.filter.selectedFilter === $scope.customFilterName) {
                $scope.filter.selectedFilter = customPermissions.Service_List_Todo ? 'Todo' : 'All';
            }

            if ($scope.storageFilters.length > 0) {
                setSelectedFilter($scope.storageFilters[0].name);
            } else {
                setSelectedFilter(null);
            }
        };

        function getFiltersFromStorage() {
            var filters = userSettingsManager.GetUserSettingsProperty('Filters__c');

            if (!filters) return [];else return JSON.parse(userSettingsManager.GetUserSettingsProperty('Filters__c'));
        }

        function saveFilterToStorage() {
            return userSettingsManager.SetUserSettingsProperty('Filters__c', JSON.stringify($scope.storageFilters));
        }

        function addStorageFiltersToList() {

            if (useNewFilters) {
                return;
            }

            $scope.storageFilters = getFiltersFromStorage();

            for (var i = 0; i < $scope.storageFilters.length; i++) {
                $scope.filterOptions.push({
                    name: $scope.storageFilters[i].name,
                    value: $scope.storageFilters[i].name
                });
            }

            if ($scope.storageFilters.length > 0) {
                setSelectedFilter($scope.storageFilters[0].name);
            } else {
                setSelectedFilter(null);
            }
        }

        function setSelectedFilter(filterName) {
            $scope.lastSelectedFilter = filterName;
            if (filterName) {
                for (var i = 0; i < $scope.storageFilters.length; i++) {
                    if ($scope.storageFilters[i].name === filterName) {
                        $scope.filter.advancedFilter = angular.copy($scope.storageFilters[i].filter);
                    }
                }

                $scope.customFilterName = filterName;
                $scope.DisplayComboBowArrow = true;
                $scope.IsCustomFilterReadonly = true;
                $scope.displayNew = true;
                $scope.displayEdit = true;
                $scope.displayDelete = true;
            } else {
                $scope.filter.advancedFilter = getDefaultEmptyFilter();
                $scope.customFilterName = '';
                $scope.DisplayComboBowArrow = false;
                $scope.IsCustomFilterReadonly = true;
                $scope.displayNew = true;
                $scope.displayEdit = false;
                $scope.displayDelete = false;
            }
        }

        function getDefaultEmptyFilter() {
            var filterObj = {
                statusCheckboxs: {},
                minDate: new Date(),
                maxDate: new Date(),
                servicePriority: 10,
                unScheduled: true,
                violations: true,
                jeopardies: true,
                noLocation: true,
                locationsCheckboxs: {}
            };

            if (Object.keys($scope.statusTranslations).length > 0) {
                for (var statusKey in $scope.statusTranslations) {
                    filterObj.statusCheckboxs[$scope.statusTranslations[statusKey]] = true;
                }
            } else {
                $rootScope.$on('gotStatuses', function () {
                    for (var _statusKey in $scope.statusTranslations) {
                        filterObj.statusCheckboxs[$scope.statusTranslations[_statusKey]] = true;
                    }
                });
            }

            for (var i = 0; i < $scope.territories.length; i++) {
                var ter = $scope.territories[i];
                filterObj.locationsCheckboxs[ter.name] = true;
            }

            return filterObj;
        }

        function deleteFilterFromFilterList(filterName) {

            for (var i = 0; i < $scope.filterOptions.length; i++) {
                if ($scope.filterOptions[i].name === filterName) {
                    $scope.filterOptions.splice(i, 1);
                }
            }
        }

        $scope.customFilterChanged = function (customFilterName) {
            $scope.customFilterName = customFilterName;
            setSelectedFilter(customFilterName);
        };

        $scope.showDropdownCustomFilters = function ($event) {
            $event.stopPropagation();

            if ($scope.storageFilters.length > 0) $scope.showCustomFilterDropdown = !$scope.showCustomFilterDropdown;
        };

        $scope.toggleStatus = function (statusKey, statusVal) {
            if ($scope.IsCustomFilterReadonly) return;

            $scope.filter.advancedFilter.statusCheckboxs[statusVal] = !$scope.filter.advancedFilter.statusCheckboxs[statusVal];
        };

        $scope.toggleLocation = function (territoryName) {
            if ($scope.IsCustomFilterReadonly) return;

            if (territoryName) $scope.filter.advancedFilter.locationsCheckboxs[territoryName] = !$scope.filter.advancedFilter.locationsCheckboxs[territoryName];else $scope.filter.advancedFilter.noLocation = !$scope.filter.advancedFilter.noLocation;
        };

        $scope.clearRecentlyViewed = function () {
            for (var k in servicesService.recentlyUsed) {
                delete servicesService.recentlyUsed[k];
            }
        };

        $scope.openLocationFiltering = function () {
            LeftLocationFilteringService.open();
        };

        $scope.getStyleForServiceInList = function (service) {

            if (window.paletteViewActive && service.ganttPaletteColor) {
                return { background: service.ganttPaletteColor.color };
            } else {
                return { background: service.ganttColor };
            }
        };

        var prevChecksum = null,
            runServiceFilters = _.debounce(function () {

            //utils.safeApply($scope, function () {

            var filterFunction = $filter('servicesListFilter'),
                paginationFunction = $filter('pagination'),
                services = filterFunction($scope.servicesObjects(), $scope.filter, $scope.getColumnsToDisplay(), $scope.filtersMap);

            if (prevChecksum !== services.checksum || __gantt.inday.isInDayRunning) {

                prevChecksum = services.checksum;

                utils.safeApply($scope, function () {
                    $scope.filteredServices.servicesArray = paginationFunction(services, $scope.filter.currentPage, $scope.filter.servicesPerPage);
                });
            }

            //});

        }, 400, { maxWait: 2000 });

        $scope.getServiceListFilter = function () {
            runServiceFilters();
            // TODO : Send services to iframe map - NO GOOD _ gets called constantly
            return $scope.filteredServices.servicesArray;
        };

        $scope.searchServiceByIdOrName = function (str) {

            $scope.notFoundOnServer = false;

            servicesService.searchServiceByIdOrName(str).then(function (id) {

                if (id) {

                    // check rules only if "Always" mode
                    window.__gantt.checkRulesMode === 'Always' && servicesService.checkRules([id]).then(servicesService.drawViolationsOnGantt);

                    $scope.filter.searchOnServer = id;

                    var isSearchFilterAlreadyAdded = $scope.filterOptions.find(function (s) {
                        return s.Id === 'SearchOnServer';
                    });

                    !isSearchFilterAlreadyAdded && $scope.filterOptions.push({
                        Name: customLabels.searchOnServer,
                        name: customLabels.searchOnServer,
                        old: true,
                        Id: "SearchOnServer",
                        value: "SearchOnServer"
                    });

                    $scope.filter.lastSelectedFilter = $scope.filter.selectedFilter;
                    $scope.filter.selectedFilter = "SearchOnServer";
                } else {
                    $scope.notFoundOnServer = true;
                }
            }).catch(function (ex) {
                console.warn(ex);
            });
        };

        $scope.resetSearchText = function () {

            $scope.notFoundOnServer = null;
            $scope.filter.SearchText = '';

            if ($scope.filter.selectedFilter === 'SearchOnServer') {

                $scope.filter.selectedFilter = $scope.filter.lastSelectedFilter;

                if ($scope.filterOptions[$scope.filterOptions.length - 1].Id === "SearchOnServer") {
                    $scope.filterOptions.pop();
                }
            }
        };

        $scope.saveSettingsOfHorizonDates = function () {
            saveDateHorizonDateFieldsDebounced();
        };

        var saveDateHorizonDateFieldsDebounced = _.debounce(function () {
            userSettingsManager.SetUserSettingsProperty('Date_Horizon_Properties__c', JSON.stringify($scope.filter.selectedFiled));
        }, 800);

        $scope.customActions = [];
        utils.customActionsPromise.then(function () {
            var _$scope$customActions;

            var customServiceActions = utils.getCustomActions('list');
            (_$scope$customActions = $scope.customActions).push.apply(_$scope$customActions, _toConsumableArray(customServiceActions));
        });

        $scope.runCustomServiceAction = function (event, serviceId) {

            var actionIndex = parseInt($(event.currentTarget).attr('actionId')),
                servicesIds = [serviceId],
                action = utils.getCustomActions('list')[actionIndex];

            if (action.visualforce) {

                var startDateStr = scheduler._min_date.getMonth() + 1 + "-" + scheduler._min_date.getDate() + "-" + scheduler._min_date.getFullYear(),
                    endDateStr = scheduler._max_date.getMonth() + 1 + "-" + scheduler._max_date.getDate() + "-" + scheduler._max_date.getFullYear();

                //GeneralLightbox.open(action.name, action.visualforce + '?services=' + servicesIds.join(',') + '&start=' + startDateStr + '&end=' + endDateStr);

                if (servicesIds.length === 1) {
                    GeneralLightbox.open(action.name, action.visualforce + '?id=' + servicesIds[0] + '&start=' + startDateStr + '&end=' + endDateStr);
                } else {
                    GeneralLightbox.open(action.name, action.visualforce + '?services=' + servicesIds.join(',') + '&start=' + startDateStr + '&end=' + endDateStr);
                }
            } else {

                sfdcService.callRemoteAction(RemoteActions.runCustomServiceAction, action.className, servicesIds, scheduler._min_date, scheduler._max_date).then(function (res) {

                    if (res) {
                        utils.addNotification(action.name, res, null, null);
                    }
                }).catch(function (ev) {
                    return utils.addNotification(action.name, ev.message, null, null);
                });
            }
        };

        $scope.showTerritoriesFiltering = function () {
            LeftSideLocationFilteringService.open();
        };

        $scope.getStyleForServiceItem = function (service) {

            var style = {};

            if (service.violations || service.jeopardy) {
                return style;
            }

            // handle gradient
            if ($scope.ganttSettings.serviceColoring === 'gradient') {

                if (window.paletteViewActive && service.ganttPaletteColor) {
                    style['background'] = 'linear-gradient(to right, ' + service.ganttPaletteColor.color + ' -85%,#ffffff 65%)';
                } else if (service.ganttColor) {
                    style['background'] = 'linear-gradient(to right, ' + service.ganttColor + ' -85%,#ffffff 65%)';
                } else {

                    var color = getColorHexByCategory(service.statusCategory);
                    style['background'] = 'linear-gradient(to right, ' + color + ' -85%,#ffffff 65%)';
                }
            }

            // handle full
            if ($scope.ganttSettings.serviceColoring === 'full') {

                if ($scope.ganttSettings.serviceColoring === 'full') {

                    if (window.paletteViewActive && service.ganttPaletteColor) {
                        style['background'] = service.ganttPaletteColor.color + '70';
                    } else if (service.ganttColor) {
                        style['background'] = service.ganttColor + '70';
                    } else {

                        var _color = getColorHexByCategory(service.statusCategory);
                        style['background'] = _color + '70';
                    }
                }
            }

            return style;
        };

        $scope.highlightOnGantt = function () {
            var on = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;


            window.__servicesInFilter = { applied: on };

            if (!on) {
                updateViewDebounced();
                return;
            }

            var filterFunction = $filter('servicesListFilter'),
                services = filterFunction($scope.servicesObjects(), $scope.filter, $scope.getColumnsToDisplay(), $scope.filtersMap);

            services.forEach(function (s) {
                return window.__servicesInFilter[s.id] = true;
            });

            updateViewDebounced();
        };

        $scope.shouldShowClearHighlight = function () {
            if (window.__servicesInFilter) {
                return window.__servicesInFilter.applied;
            } else {
                return false;
            }
        };

        function getColorHexByCategory(statusCategory) {

            switch (statusCategory) {

                case SERVICE_CATEGORY.NONE:
                    return '#a5e2d6';

                case SERVICE_CATEGORY.SCHEDULED:
                    return '#F9D058';

                case SERVICE_CATEGORY.DISPATCHED:
                    return '#8DD8FA';

                case SERVICE_CATEGORY.IN_PROGRESS:
                    return '#D68EF9';

                case SERVICE_CATEGORY.COMPLETED:
                    return '#95d155';

                case SERVICE_CATEGORY.COULD_NOT_COMPLETE:
                    return '#f58556';

                case SERVICE_CATEGORY.CANCELED:
                    return '#BEBCBA';

                default:
                    return '#B7C9EA';

            }
        }

        $scope.changeToSelectedServiceList = function () {
            if ($scope.selectorService.countSelectedServices() && utils.hasCustomPermission('Service_List_Selected')) {
                $scope.filter.selectedFilter = 'Selected';
            }
        };

        $scope.getSelectedClickableClass = function () {
            if ($scope.selectorService.countSelectedServices() && utils.hasCustomPermission('Service_List_Selected')) {
                return 'list-selected-blue';
            }

            return '';
        };

        $scope.clearSelectedServices = function () {
            ServiceSelectorService.unselectAll();
        };

        $scope.openLightboxLabel = function () {
            return window.__gantt.editOnServiceAppointment ? customLabels.Edit : customLabels.Details;
        };

        $scope.openLightboxIcon = function () {
            return window.__gantt.editOnServiceAppointment ? lsdIcons.edit : lsdIcons.info;
        };

        $scope.searchTermChanges = function () {

            $scope.notFoundOnServer = null;

            if ($scope.filter.selectedFilter === 'SearchOnServer' && $scope.filter.SearchText === '') {
                $scope.resetSearchText();
            }
        };
    }]);
})();
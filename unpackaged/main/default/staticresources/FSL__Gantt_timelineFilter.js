'use strict';

(function () {

    angular.module('serviceExpert').filter('timelineFilter', timelineFilter);

    timelineFilter.$inject = ['utils', 'LeftSideLocationFilteringService', 'ResourcesAndTerritoriesService', 'TimePhasedDataService', 'ResourceCrewsService', 'SkillsService', 'calendarsService', 'userSettingsManager', 'GetSlotsService', 'StateService', 'resourceFilterHelper', 'LastKnownPositionService', 'monthlyViewHelperService', 'DeltaService', 'RegisterService', 'OptimizationRequestsService'];

    function timelineFilter(utils, LeftSideLocationFilteringService, ResourcesAndTerritoriesService, TimePhasedDataService, ResourceCrewsService, SkillsService, calendarsService, userSettingsManager, GetSlotsService, StateService, resourceFilterHelper, LastKnownPositionService, monthlyViewHelperService, DeltaService, RegisterService, OptimizationRequestsService) {

        var nowUtc = new Date().getTime();

        setInterval(function () {
            return nowUtc += 60000;
        }, 60000);

        // register for updated positions and update the resource object
        RegisterService.register('positions', function (updatedPositions) {

            var resources = ResourcesAndTerritoriesService.getResources();

            for (var resourceId in updatedPositions) {

                if (!resources[resourceId]) {
                    continue;
                }

                resources[resourceId].lastKnownLongitude = updatedPositions[resourceId].longitude;
                resources[resourceId].lastKnownLocationDate = updatedPositions[resourceId].lastModifiedDate.getTime() - updatedPositions[resourceId].lastModifiedDate.getTimezoneOffset() * 1000 * 60;
                resources[resourceId].lastKnownLatitude = updatedPositions[resourceId].latitude;
            }
        });

        return function (resources, filterText, skillsFilter, selectedSkills, skillsLogicOperator, resourceFilterOptions, resourceFieldsetOptions) {

            var timelineData = [],
                rowsIndexToIds = {},
                selectedSkillsArray = [],
                searchResourceNameArray = filterText.replace(/, /g, ',').split(','),
                resourcesAndTerritories = TimePhasedDataService.resourcesAndTerritories(),
                resourceToServiceCrewMembers = TimePhasedDataService.resourceToServiceCrewMembers(),
                territoriesArray = LeftSideLocationFilteringService.getTerritoriesSortedByTree(),
                loadedLocations = userSettingsManager.GetUserSettingsProperty('locations');

            __gantt.inday.isInDayRunning = false;

            // FSL810 - don't iterate over all territories, only filtered ones
            territoriesArray = territoriesArray.filter(function (territory) {
                return loadedLocations.find(function (id) {
                    return id === territory.id;
                });
            });

            // create territories objects
            territoriesArray.forEach(function (territory) {
                timelineData.push(new Territory(territory, ResourcesAndTerritoriesService.getOperatingHours()[territory.operatingHours], StateService));
                rowsIndexToIds[territory.id] = timelineData.length - 1;
            });

            // if we have skills filter defined, create an arry with all the selected keys
            if (skillsFilter) {
                for (var skillId in selectedSkills) {
                    selectedSkills[skillId] && selectedSkillsArray.push(skillId);
                }
            }

            var CandidatesShouldBeFiltered = utils.ganttSettings && utils.ganttSettings.filterCandidates;
            // go over all resources that have a timephase
            for (var resourceId in resourcesAndTerritories) {

                var obj = resourcesAndTerritories[resourceId],
                    resource = ResourcesAndTerritoriesService.getResources()[resourceId];

                // check that resource exist - might have no permissions
                if (!resource) {
                    continue;
                }

                // check if resource is filtered by name
                if (!isSearchResourceMatched(resource.name, searchResourceNameArray)) {
                    continue;
                }

                // check if resource DOES NOT have all selected skills skills (including timephase)
                if (skillsLogicOperator === 'and' && selectedSkillsArray.length > 0 && skillsFilter && !SkillsService.doesHaveSkills(resourceId, selectedSkillsArray, scheduler._min_date, scheduler._max_date)) {
                    continue;
                } else if (skillsLogicOperator === 'or' && selectedSkillsArray.length > 0 && skillsFilter && !SkillsService.doesHaveSomeSkills(resourceId, selectedSkillsArray, scheduler._min_date, scheduler._max_date)) {
                    continue;
                }

                var foundMissMatchedSkill = false;

                // fieldset check - booleans
                for (var iField in resourceFieldsetOptions.resourceFilteringOptions) {

                    // does a certian boolean is checked on the filter? if so, check if it's true on the resource
                    if (resourceFieldsetOptions.resourceFilteringOptions[iField]) {
                        if (!resource.sobject[iField]) {
                            foundMissMatchedSkill = true;
                            break;
                        }
                    }
                }

                // a boolean field wasn't found on the resource, we shouldn't include it;
                if (foundMissMatchedSkill) {
                    continue;
                }

                // fieldset check - fieldset
                if (resourceFieldsetOptions.selectedPicklist !== 'select_a_field') {

                    // is the picklist value NOT selected? (at least 1 value should be selected!)
                    if (resourceFieldsetOptions.picklistOptions.length > 0 && resourceFieldsetOptions.picklistOptions.indexOf(resource.sobject[resourceFieldsetOptions.selectedPicklist]) === -1) {

                        // no null values accepted
                        if (!resourceFieldsetOptions.picklistNullValues) {
                            continue;
                        }

                        // null values accepted but the picklist value IS defined
                        else if (typeof resource.sobject[resourceFieldsetOptions.selectedPicklist] !== 'undefined') {
                                continue;
                            }
                    }

                    // only "not defined" is selected
                    if (resourceFieldsetOptions.picklistOptions.length === 0 && resourceFieldsetOptions.picklistNullValues && typeof resource.sobject[resourceFieldsetOptions.selectedPicklist] !== 'undefined') {
                        continue;
                    }
                }

                if (TimePhasedDataService.isCrewViewActive) {
                    var crewAndHisMembers = TimePhasedDataService.currentCrewToShow;

                    if (crewAndHisMembers[resourceId] === undefined) {
                        continue;
                    } else if (crewAndHisMembers[resourceId].members !== undefined) {

                        var foundMemberIntersect = false;

                        for (var key in crewAndHisMembers[resourceId].members) {

                            var startMember;
                            var endMember;

                            if (useLocationTimezone) {
                                for (var timephaseId in obj) {
                                    if (isTimephaseIntersect(scheduler._min_date, scheduler._max_date, obj[timephaseId].effectiveStartDate, obj[timephaseId].effectiveEndDate)) {
                                        startMember = utils.convertDateBetweenTimeZones(crewAndHisMembers[resourceId].members[key].startDate, 'GMT', obj[timephaseId].timezone);
                                        endMember = utils.convertDateBetweenTimeZones(crewAndHisMembers[resourceId].members[key].endDate, 'GMT', obj[timephaseId].timezone);

                                        if (isTimephaseIntersect(scheduler._min_date, scheduler._max_date, startMember, endMember)) {
                                            foundMemberIntersect = true;
                                        }
                                    }
                                }
                            } else {
                                startMember = utils.convertDateBetweenTimeZones(crewAndHisMembers[resourceId].members[key].startDate, 'GMT', userTimeZone);
                                endMember = utils.convertDateBetweenTimeZones(crewAndHisMembers[resourceId].members[key].endDate, 'GMT', userTimeZone);

                                if (isTimephaseIntersect(scheduler._min_date, scheduler._max_date, startMember, endMember)) {
                                    foundMemberIntersect = true;
                                }
                            }
                        }

                        if (foundMemberIntersect === false) {
                            continue;
                        }
                    }
                }

                // Crew Filter
                if (resourceFieldsetOptions.crewsSelectionOptions.selectedPicklist !== customLabels.showAll) {
                    utils.crewsFilter = true;

                    if (resourceFieldsetOptions.crewsSelectionOptions.selectedPicklist === customLabels.hideCrewMembers) {
                        if (resource.sobject['ResourceType'] !== 'C') {
                            var isCrewMemberInHorizon = false;

                            for (var memberKey in resourceToServiceCrewMembers[resourceId]) {
                                if (isTimephaseIntersect(scheduler._min_date, scheduler._max_date, resourceToServiceCrewMembers[resourceId][memberKey].startDate, resourceToServiceCrewMembers[resourceId][memberKey].endDate)) {
                                    isCrewMemberInHorizon = true;
                                }
                            }

                            if (isCrewMemberInHorizon === true) {
                                continue;
                            }
                        }
                    } else if (resourceFieldsetOptions.crewsSelectionOptions.selectedPicklist === customLabels.showCrewsAndCrewMembers) {

                        if (resource.sobject['ResourceType'] !== 'C') {
                            var _isCrewMemberInHorizon = false;

                            for (var _memberKey in resourceToServiceCrewMembers[resourceId]) {
                                if (isTimephaseIntersect(scheduler._min_date, scheduler._max_date, resourceToServiceCrewMembers[resourceId][_memberKey].startDate, resourceToServiceCrewMembers[resourceId][_memberKey].endDate)) {
                                    _isCrewMemberInHorizon = true;
                                }
                            }

                            if (_isCrewMemberInHorizon !== true) {
                                continue;
                            }
                        }
                    } else if (resourceFieldsetOptions.crewsSelectionOptions.selectedPicklist === customLabels.showOnlyCrews) {

                        if (resource.sobject['ResourceType'] !== 'C') {
                            continue;
                        }
                    } else if (resourceFieldsetOptions.crewsSelectionOptions.selectedPicklist === customLabels.hideCrewsAndCrewMembers) {

                        if (resource.sobject['ResourceType'] === 'C') {
                            continue;
                        } else {
                            var _isCrewMemberInHorizon2 = false;

                            for (var _memberKey2 in resourceToServiceCrewMembers[resourceId]) {
                                if (isTimephaseIntersect(scheduler._min_date, scheduler._max_date, resourceToServiceCrewMembers[resourceId][_memberKey2].startDate, resourceToServiceCrewMembers[resourceId][_memberKey2].endDate)) {
                                    _isCrewMemberInHorizon2 = true;
                                }
                            }

                            if (_isCrewMemberInHorizon2 === true) {
                                continue;
                            }
                        }
                    }
                } else {
                    utils.crewsFilter = false;
                }

                // if get candidates was invoked, show only resources that are candidates
                if (CandidatesShouldBeFiltered) {
                    // Checking if the FilterResources feature is enabled first
                    if (GetSlotsService.getCandidatesIds() && !GetSlotsService.getCandidatesIds()[resourceId]) {
                        continue;
                    }
                }

                // check if timephase intersect
                for (var _timephaseId in obj) {
                    // only working resources
                    var sectionId = utils.generateResourceId(obj[_timephaseId].serviceResource, obj[_timephaseId].serviceTerritory);
                    if (resourceFilterOptions.showWorkingResource && !isResourceWorkingInVisibleGantt(sectionId, calendarsService, utils)) continue;

                    // check if 4 words is in loaded locations (in case of a relocation outside of loaded data)
                    if (loadedLocations && loadedLocations.indexOf(obj[_timephaseId].serviceTerritory) == -1) continue;

                    if (isTimephaseIntersect(scheduler._min_date, scheduler._max_date, obj[_timephaseId].effectiveStartDate, obj[_timephaseId].effectiveEndDate)) {
                        var territoryFolder = timelineData[rowsIndexToIds[obj[_timephaseId].serviceTerritory]],
                            territoryResource = new Resource(utils.generateResourceId, ResourcesAndTerritoriesService.getResources()[obj[_timephaseId].serviceResource], obj[_timephaseId].serviceTerritory, isResourceOnline(ResourcesAndTerritoriesService.getResources()[obj[_timephaseId].serviceResource]),
                        /* Uncomment to start overstaff feature    isResourceCrewUnderstaffOrOverstaff(scheduler._min_date, scheduler._max_date, ResourcesAndTerritoriesService.getResources()[obj[timephaseId].serviceResource]), */
                        false, isSecondaryStm(obj[_timephaseId]), monthlyViewHelperService);

                        if (territoryFolder && territoryFolder.children.map(function (row) {
                            return row.key;
                        }).indexOf(territoryResource.key) === -1) {
                            territoryFolder.children.push(territoryResource);
                        }
                    }
                }
            }

            // remove territories that have no active resources
            var emptyTerritories = [],
                totalRemoved = 0;
            timelineData.forEach(function (value, index) {
                return value.children.length === 0 && emptyTerritories.push(index);
            });
            emptyTerritories.forEach(function (value) {
                return timelineData.splice(value - totalRemoved++, 1);
            });
            timelineData.forEach(function (value) {
                value.children.sort(sortByField);

                var optRequset = OptimizationRequestsService.isTerritoryHasInDayOptimizationInProgress(scheduler._min_date, scheduler._max_date, value.key);
                if (optRequset) {
                    __gantt.inday.isInDayRunning = true;
                    value.addInDayOptimizationInProgress(optRequset, OptimizationRequestsService.calculateIndayProgress);
                }
            });

            if (utils.hasCustomPermission('Utilization_on_Service_Territory') && showDailyUtilization && scheduler._mode !== 'MonthlyView' && scheduler._mode !== 'MTDView' && scheduler._mode !== 'LongView') {
                timelineData.forEach(function (value) {

                    var percent = void 0,
                        daysUtilization = [];

                    for (var currDate = new Date(scheduler._min_date); currDate < scheduler._max_date; currDate.setDate(currDate.getDate() + 1)) {
                        daysUtilization.push(monthlyViewHelperService.calculateLocation(value.children, currDate));
                    }

                    var sum = daysUtilization.reduce(function (totals, current) {
                        totals.break += current.break;
                        totals.capacity += current.capacity;
                        totals.overtime += current.overtime;
                        totals.service += current.service;
                        totals.travel += current.travel;
                        totals.na += current.na;

                        return totals;
                    }, { break: 0, capacity: 0, overtime: 0, service: 0, travel: 0, na: 0 });

                    percent = monthlyViewHelperService.calculateLocationUtilization(sum);
                    value.addUtilizationHtml(percent);
                });
            }

            return timelineData;

            function isResourceOnline(resource) {

                if (!resource.lastKnownLocationDate) {
                    resource.online = false;
                    return false;
                }

                if (resource.lastKnownLocationDate && resource.onlineOffset) {
                    var offsetFromUserTimezone = moment(nowUtc).tz(window.userTimeZone)._offset;
                    resource.lastSeen = parseInt((nowUtc - resource.lastKnownLocationDate) / 1000 / 60 + offsetFromUserTimezone);

                    if (resource.lastKnownLocationDate + (resource.onlineOffset - offsetFromUserTimezone) * 60 * 1000 > nowUtc && resource.lastSeen >= 0) {
                        resource.online = true;
                        return true;
                    }
                }

                resource.online = false;
                return false;
            }

            function isResourceCrewUnderstaffOrOverstaff(minDate, maxDate, resource) {
                if (resource.resourceType !== 'C') {
                    return false;
                } else {
                    var actualCrewSize = 0;
                    var crewSize = resource.serviceCrew__r.CrewSize;
                    var currDay = new Date(minDate);

                    var crewMembers = TimePhasedDataService.crewToServiceCrewMembers()[resource.serviceCrew];

                    while (currDay < maxDate) {

                        for (var _key in crewMembers) {
                            var currentMember = crewMembers[_key];

                            if (isTimephaseIntersect(currDay, currDay, currentMember.startDate, currentMember.endDate)) {
                                actualCrewSize++;
                            }
                        }

                        if (actualCrewSize < crewSize) {
                            return true;
                        }

                        actualCrewSize = 0;
                        currDay.setDate(currDay.getDate() + 1);
                    }

                    return false;
                }
            }

            // sort by field
            function sortByField(a, b) {
                var fieldRes1 = ResourcesAndTerritoriesService.getResources()[a.resourceId].sobject[resourceFilterHelper.resourceFieldToSortyBy],
                    fieldRes2 = ResourcesAndTerritoriesService.getResources()[b.resourceId].sobject[resourceFilterHelper.resourceFieldToSortyBy],
                    descending = resourceFilterHelper.descending ? 1 : -1;

                // W-9563114
                if (fieldRes1 === undefined && fieldRes2 === undefined) {
                    return 0;
                }

                if (fieldRes1 === undefined && fieldRes2 !== undefined) {
                    return descending * -1;
                }

                if (fieldRes1 !== undefined && fieldRes2 === undefined) {
                    return descending;
                }

                if (fieldRes1 > fieldRes2) return descending;

                if (fieldRes1 < fieldRes2) return -1 * descending;

                return 0;
            }
        };
    }

    function isResourceWorkingInVisibleGantt(sectionId, calendarsService, utils) {
        var currDate = new Date(scheduler._min_date),
            currResourceDates = calendarsService.resourceToWorkingDates[sectionId];

        if (!currResourceDates) return false;

        while (currDate < scheduler._max_date) {
            var resourceSingleDay = currResourceDates[utils.formatDayToString(currDate)];

            if (resourceSingleDay && (resourceSingleDay.regular > 0 || resourceSingleDay.overtime > 0)) {
                return true;
            }

            currDate.setDate(currDate.getDate() + 1);
        }

        return false;
    }

    // check if name is in array
    function isSearchResourceMatched(name, namesArray) {

        if (namesArray.length === 0) {
            return true;
        }

        for (var i = 0; i < namesArray.length; i++) {
            if (name.toLowerCase().indexOf(namesArray[i].toLowerCase()) > -1) {
                return true;
            }
        }

        return false;
    }

    function isSecondaryStm(stmObj) {
        return stmObj.serviceTerritoryType === 'S';
    }

    // check if timephases intersect
    function isTimephaseIntersect(date1_start, date1_end, date2_start, date2_end) {
        return isIntersect(date1_start, date1_end, date2_start, date2_end);
    }

    // location object for dhtmlx
    function Territory(territory, operatingHours, StateService) {
        this.key = territory.id;
        this.name = territory.name;
        this.children = [];
        this.generateHtml(territory, operatingHours.timezone);

        if (StateService.ganttOpenedTerritories[territory.id] === undefined) {
            StateService.ganttOpenedTerritories[territory.id] = true;
        }

        this.open = StateService.ganttOpenedTerritories[territory.id];
    }

    // generate HTML template for folders
    Territory.prototype.generateHtml = function (territory, tzName) {

        if (territory.parentTerritory) {
            this.label = '<div class="truncate ParentName" title="' + territory.parentTerritory.name.encodeHTML() + '">' + territory.parentTerritory.name.encodeHTML() + '</div>\n                          <div class="truncate LocationName" title="' + territory.name.encodeHTML() + '">' + territory.name.encodeHTML() + '</div>';
        } else {
            this.label = '<div class="truncate LocationName no-parent-location" title="' + territory.name.encodeHTML() + '">' + territory.name.encodeHTML() + '</div>';
        }

        if (scheduler._mode !== 'MonthlyView' && scheduler._mode !== 'MTDView') {
            var gmtNow = new Date(),
                marginTop = territory.parentTerritory ? 'margin-top:-26px;' : '';

            gmtNow = new Date(gmtNow.valueOf() + gmtNow.getTimezoneOffset() * 60000);
            gmtNow.setMinutes(gmtNow.getMinutes() + utils.getLocationOffset(gmtNow, territory.id));

            this.label += '<div class=\'timeZoneFolder\' style="' + marginTop + '">' + tzName + ' - ' + moment(gmtNow).format('llll') + '</div>';
        }
    };

    Territory.prototype.addInDayOptimizationInProgress = function (request, calculateProgressFunction) {
        var whereToInsert = this.label.indexOf('</div>');
        var addParentStyle = ''; //this.label.indexOf('Parent') > -1 ? 'style="margin-top: -9px"' : '';
        var progressText = customLabels.PreparingData;
        var progress = { percent: 0 };

        if (request.objectToScheduled != null) {
            progress = calculateProgressFunction(request);
            progressText = progress.text;
        }

        var progressBar = '<div class="inday-opt-progress">\n                            <span class="opt-progress-preparing">' + progressText + '</span>\n                                <span class="opt-progress-text">' + progress.percent + '%</span>\n\n                                <div class="opt-progress-bar inday-progress-animation" style="width:' + progress.percent + '%">\n                            </div>\n\n                        </div>';
        var inDayOptimizationInProgress = '<div class="inDayOptimizationRunningContainer"><span>' + progressBar + '</span></div>';
        var territoryBox = '<div class="left-territory-info-box" ' + addParentStyle + '>' + inDayOptimizationInProgress + '</div>';
        this.label = this.label.slice(0, whereToInsert + 6) + territoryBox + this.label.slice(whereToInsert + 6);
    };

    Territory.prototype.addUtilizationHtml = function (percent) {

        var whereToInsert = this.label.indexOf('</div>'),
            percentClassColor = 'green-daily-utlz',
            foundInDayIndex = this.label.indexOf('inDayOptimizationRunningContainer');
        var addParentStyle = foundInDayIndex == -1 && this.label.indexOf('Parent') > -1 ? 'style="margin-top: -9px"' : '';

        if (percent >= monthlyViewSettings.high && percent < monthlyViewSettings.critical) {
            percentClassColor = 'yellow-daily-utlz';
        } else if (percent >= monthlyViewSettings.critical) {
            percentClassColor = 'red-daily-utlz';
        }

        var ieClass = '';
        if (navigator.userAgent.indexOf("rv:11.0") > -1) {
            ieClass = 'dailyViewUtilizationIE';
        }

        if (percent !== null) {

            // if no territory members, we get a null, display nothing
            var percentHtml = '<b class="' + percentClassColor + '">' + percent + '%</b>';

            if (foundInDayIndex > -1) {
                percent = '<div class="dailyViewUtilization ' + ieClass + ' utilizationWithInday"><span>' + customLabels.UtilizationDaily.replace('$0', percentHtml) + ' </span></div>';
                this.label = this.label.slice(0, foundInDayIndex - 12) + percent + this.label.slice(foundInDayIndex - 12);
            } else {
                percent = '<div class="dailyViewUtilization ' + ieClass + '" ' + addParentStyle + '><span>' + customLabels.UtilizationDaily.replace('$0', percentHtml) + '</span> </div>';
                this.label = this.label.slice(0, whereToInsert + 6) + percent + this.label.slice(whereToInsert + 6);
            }
        }
    };

    // resource object for dhtmlx
    function Resource(generateIdFunction, resourceObject, territoryId, online, isResourceCrewUnderstaffOrOverstaff, secondary, monthlyViewHelperService) {
        this.key = generateIdFunction(resourceObject.id, territoryId);
        this.resourceId = resourceObject.id;
        this.name = resourceObject.name;
        this.contractor = resourceObject.isCapacityBased;
        this.online = online;
        this.lastSeen = resourceObject.lastSeen;
        this.secondary = secondary;
        this.isUndestaffOrOverstaff = isResourceCrewUnderstaffOrOverstaff;
        this.utilization = null;
        this.calculatePeriodUtilization(monthlyViewHelperService, resourceObject);
        resourceObject.isUndestaffOrOverstaff = isResourceCrewUnderstaffOrOverstaff;
        this.generateHtml(resourceObject);
    }

    // calculate period utilization - only in utilization view
    Resource.prototype.calculatePeriodUtilization = function (monthlyViewHelperService, resourceObject) {

        if (scheduler._mode === 'MonthlyView') {

            var resourceDaysUtilization = [];

            for (var currDate = new Date(scheduler._min_date); currDate < scheduler._max_date; currDate.setDate(currDate.getDate() + 1)) {
                resourceDaysUtilization.push(monthlyViewHelperService.calculateDailyResourceCapacity(this, currDate));
            }

            var sum = resourceDaysUtilization.reduce(function (totals, current) {
                totals.break += current.break;
                totals.capacity += current.capacity;
                totals.overtime += current.overtime;
                totals.service += current.service;
                totals.travel += current.travel;
                totals.na += current.na;

                return totals;
            }, { break: 0, capacity: 0, overtime: 0, service: 0, travel: 0, na: 0 });

            this.utilization = monthlyViewHelperService.calculateLocationUtilization(sum);
            resourceObject.sobject['__Utilization__'] = this.utilization; // needed for sorting
        }
    };

    // generate HTML template for resources
    Resource.prototype.generateHtml = function (resourceObject) {

        this.label = '';

        var onlineClass = this.online ? 'online-indicator' : 'online-indicator offline-indicator';

        var secondaryText = this.secondary ? '<span class=\'secondaryGanttLabel\' title="' + customLabels.Secondary + '">(' + customLabels.Secondary + ')</span>' : '';

        var onlineHtml = !!resourceObject.lastKnownLocationDate && this.lastSeen < 60 * 24 && this.lastSeen >= 0 ? '<div class="' + onlineClass + '" title="' + utils.hoursMinutes(this.lastSeen, customLabels.SeenXMinsHoursAgo, customLabels.SeenXAgoHours, customLabels.SeenXAgo) + '"></div>' : '';

        if (resourceObject.serviceCrew__r !== undefined) {
            var resourcePhotoClass = scheduler.matrix.ZoomLevel3.dy < 33 ? 'SmallResourceCrewPhoto' : 'ResourceCrewPhoto',
                underStaff = '';

            /* Uncomment to start overstaff feature
            if(resourceObject.isUndestaffOrOverstaff){
                underStaff = `<i class="fa fa-exclamation-circle underStaffCrew-indicator" aria-hidden="true"></i>`;
            }
            */

            if (resourceObject.pictureLink) {
                this.label += '<img src=\'' + resourceObject.pictureLink + '\' title=\'' + resourceObject.description + '\' class=\'' + resourcePhotoClass + '\' />';
            } else {
                this.label += '<span class=\'' + resourcePhotoClass + '\'><svg aria-hidden="true" class="crew-slds-icon crewContextMenuIcon"><use xlink:href=\'' + lsdIcons.crew + '\'></use></svg></span>';
            }

            this.label += '' + underStaff + onlineHtml;
        } else if (resourceObject.pictureLink) {
            var _resourcePhotoClass = scheduler.matrix.ZoomLevel3.dy < 33 ? 'SmallResourcePhoto' : 'ResourcePhoto';
            this.label += '<img src=\'' + resourceObject.pictureLink + '\' title=\'' + resourceObject.description + '\' class=\'' + _resourcePhotoClass + '\' />' + onlineHtml;
        } else {
            var resourcePhotoDefault = scheduler.matrix.ZoomLevel3.dy < 33 ? 'SmallResourcePhotoDefault' : 'NormalResourcePhotoDefault';
            this.label += '<div title=\'' + resourceObject.description + '\' class="ResourcePhotoIcon ' + resourcePhotoDefault + '"></div>' + onlineHtml;
        }

        // add resource menu button (no need to change size according to row height)
        this.label += '<div class="resourceMenuBtn">\n                            <svg aria-hidden="true" class="slds-icon resourceMenuIcon">\n                                <use xlink:href="' + lsdIcons.threedots + '"></use>\n                            </svg>\n                        </div>';

        // if (resourceObject.ganttLabel || scheduler._mode === 'MonthlyView') {

        var displayedLabel = resourceObject.ganttLabel ? utils.escapeResourceName(resourceObject.ganttLabel) : '';

        // W-9311443
        var nameEscaped = utils.escapeResourceName(this.name),
            titleText = utils.escapeResourceName(this.name);

        if (resourceObject.description) {
            titleText = this.name + ' - ' + resourceObject.description;
        }

        if (scheduler._mode === 'MonthlyView' && this.utilization !== null) {

            var utilizationCssClass = 'resource-utiliz-low';

            displayedLabel = customLabels.TotalUtilizationResource;

            if (monthlyViewSettings.critical <= this.utilization) {
                utilizationCssClass = 'resource-utiliz-high';
            } else if (monthlyViewSettings.high <= this.utilization) {
                utilizationCssClass = 'resource-utiliz-med';
            }

            displayedLabel += ' <span class="' + utilizationCssClass + '">' + this.utilization + '%</span>';

            if (scheduler.matrix.ZoomLevel3.dy < 33) {
                this.label += '<a resource=\'' + this.resourceId + '\' class="truncate smallResourceNameField" title=\'' + titleText + '\'>' + nameEscaped + ' ' + secondaryText + '\n                    <div class=\'smallResourceGanttLabel truncate\'>' + displayedLabel + '</div></a>';
            } else {
                this.label += '<a resource=\'' + this.resourceId + '\' class=\'truncate smallResourceName resourceYup\' title=\'' + titleText + '\'>' + nameEscaped + ' ' + secondaryText + '\n                    <div class=\'resourceGanttLabel truncate\'>' + displayedLabel + '</div></a>';
            }
        } else {
            //if (scheduler._mode !== 'MonthlyView') {

            if (resourceObject.ganttLabel) {
                if (scheduler.matrix.ZoomLevel3.dy < 33) {
                    this.label += '<a resource=\'' + this.resourceId + '\' class="truncate smallResourceNameField" title=\'' + titleText + '\'>' + nameEscaped + ' ' + secondaryText + '\n                        <div class=\'smallResourceGanttLabel truncate\'>' + displayedLabel + '</div></a>';
                } else {
                    this.label += '<a resource=\'' + this.resourceId + '\' class=\'truncate smallResourceName resourceYup\' title=\'' + titleText + '\'>' + nameEscaped + ' ' + secondaryText + '\n                        <div class=\'resourceGanttLabel truncate\'>' + displayedLabel + '</div></a>';
                }
            } else {
                if (scheduler.matrix.ZoomLevel3.dy < 33) {
                    this.label += '<a resource=\'' + this.resourceId + '\' class=\'truncate smallResourceName resourceYup resource-no-label\' style=\'margin-top:1px;\' title=\'' + titleText + '\'>' + nameEscaped + ' ' + secondaryText + '</a>';
                } else {
                    this.label += '<a class="truncate resource-no-label" resource=\'' + this.resourceId + '\' style=\'margin-top:1px;\' title=\'' + titleText + '\'>' + nameEscaped + ' ' + secondaryText + '</a>';
                }
            }
        }

        this.label = '<div class="resourceY-container">' + this.label + '</div>';
    };
})();
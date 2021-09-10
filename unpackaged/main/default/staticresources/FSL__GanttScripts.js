'use strict';

// TODO: Sadly, globals all over this file. Need to somehow remove them :(

var globalStatuses = {},
    globalCategories = {},
    flaggedServices = {},
    contextShown = false,
    snapTo = false,
    globalSelectedGanttServices = {},
    capacityDurationFilter = 'Day',
    cachedDomElements = {},
    violationDelimiter = '&lt;br/&gt;',
    minHourToDisplay = 0,
    maxHourToDisplay = 24,
    includeWeekends = false,
    gameOn = false,
    ctrlPressed = false,
    paletteViewActive = false,
    showCandidates = {
    on: false,
    id: null
},
    folderJustToggled = false;

function setHoursToDisplay(start, finish, incWeekEnds) {
    minHourToDisplay = start;
    maxHourToDisplay = finish;
    includeWeekends = incWeekEnds;
}

$(function () {
    $('body').keydown(function (e) {
        ctrlPressed = e.ctrlKey;updateTimesToSnapIn();
    }).keyup(function (e) {
        ctrlPressed = false;updateTimesToSnapIn();
    });
});

function updateTimesToSnapIn() {

    if (cachedDomElements === undefined || cachedDomElements.timesDragFix === undefined) {
        return;
    }

    var html = cachedDomElements.timesDragFix.html(),
        newString = null;

    if (html.indexOf(customLabels.SchedulingTimesGantSnap) === 0 && !ctrlPressed) {
        newString = customLabels.SchedulingTimesGant + ' ' + html.substr(customLabels.SchedulingTimesGantSnap.length, html.length);
        cachedDomElements.timesDragFix.html(newString);
    } else if (html.indexOf(customLabels.SchedulingTimesGantSnap) !== 0 && ctrlPressed) {
        newString = customLabels.SchedulingTimesGantSnap + ' ' + html.substr(customLabels.SchedulingTimesGant.length, html.length);
        cachedDomElements.timesDragFix.html(newString);
    }
}

// display time box when dragging
function showTimesWhenDragging(start, ev) {

    cachedDomElements.timesDragFix = cachedDomElements.timesDragFix || $('#timesDragFix');

    var currentMinutes = (ev.start_date.getMinutes() + ev.travelTo / 60) % 60,
        nearDown = currentMinutes % serviceJumpsOnGantt,
        nearUp = serviceJumpsOnGantt - currentMinutes % serviceJumpsOnGantt;

    if (scheduler.getState().drag_id !== ev.id) {

        // hide time box helper
        if (!scheduler.getState().drag_id) {
            cachedDomElements.timesDragFix.hide();
        }

        return;
    }

    var realDuration = ev.finish - ev.start,
        startTraveless = new Date(start);

    startTraveless.setSeconds(0);

    if (ev.travelTo) {
        startTraveless.setSeconds(startTraveless.getSeconds() + ev.travelTo);
    }

    if (nearDown > nearUp) {
        startTraveless = new Date(startTraveless.getTime() + nearUp * 60 * 1000);
    } else {
        startTraveless = new Date(startTraveless.getTime() - nearDown * 60 * 1000);
    }

    var endTraveless = new Date(startTraveless.getTime() + realDuration);

    var realStartTime = moment(startTraveless).format('lll'),
        realEndTime = moment(endTraveless).format('lll'),
        tooltipText = customLabels.SchedulingTimesGant + '<br/>' + realStartTime + ' - ' + realEndTime;

    if (ctrlPressed) {
        tooltipText = customLabels.SchedulingTimesGantSnap + '<br/>' + realStartTime + ' - ' + realEndTime;
    }

    cachedDomElements.timesDragFix.html(tooltipText).show();
}

// generate break event html
function generateBreakEventHtml(ev, additionalStyles, withTravel) {

    var displayNone = '';

    if (scheduler._mode != 'ZoomLevel2' && scheduler._mode != 'ZoomLevel3' && scheduler._mode != 'ZoomLevel4') {
        displayNone = 'style="display:none;';
    }

    // label - add after img
    // let labelElement = ev.ganttLabel ? `<span class="break-label">${ev.ganttLabel.encodeHTML()}</span>` : '';

    var altText = ev.ganttLabel ? 'title="' + ev.ganttLabel + '"' : '';

    if (withTravel) {
        return '<div class="ServiceEvent" style="' + additionalStyles + '" ' + altText + '>\n                    <div class="ServiceEventPadding">\n                        <img ' + displayNone + ' src="' + lsdIcons.breakImg + '" class="breakIcon" draggable="false"/>     \n                    </div>\n                </div>';
    }

    return '<div class="ServiceEventPadding" style="' + additionalStyles + '" ' + altText + '>\n                <img ' + displayNone + ' src="' + lsdIcons.breakImg + '" class="breakIcon" draggable="false"/>\n            </div>';
}

// generate capacity event html
function generateCapacityHtml(ev) {

    var htmlString = '',
        capacityCss = 'contractorCapacityHoursUsed ',
        typeIcon = 'fa-battery-empty',
        hoursWidth = 0;

    if (ev.hoursPerTimePeriod > 0) {
        hoursWidth = ev.hoursInUse / ev.hoursPerTimePeriod * 100;
    } else if (ev.workItemsPerTimePeriod > 0) {
        hoursWidth = ev.workItemsAllocated / ev.workItemsPerTimePeriod * 100;
    }

    if (hoursWidth <= 25) {
        typeIcon = 'fa-battery-empty';
    } else if (hoursWidth <= 50) {
        typeIcon = 'fa-battery-quarter';
    } else if (hoursWidth <= 75) {
        typeIcon = 'fa-battery-half';
    } else if (hoursWidth <= 90) {
        typeIcon = 'fa-battery-three-quarters';
    } else if (hoursWidth <= 100) {
        typeIcon = 'fa-battery-full';
    } else {
        typeIcon = 'fa-battery-full';
    }

    hoursWidth = hoursWidth > 100 ? 100 : hoursWidth;
    htmlString += '<span class="' + capacityCss + '" style="width:calc(' + hoursWidth + '% - 5px);"></span>';

    if (ev.text) {
        if (scheduler._mode === 'ZoomLevel6' || scheduler._mode === 'ZoomLevel7') {
            htmlString += '<div class="ServiceEventPadding"><span class="Capacity_Label"><i class="fa ' + typeIcon + '"></i>' + ev.text.split(' ')[0] + '</span></div>';
        } else if (scheduler._mode === 'MonthlyView' || scheduler._mode === 'LongView') {
            htmlString += '<div class="ServiceEventPadding"><span class="Capacity_Label Capacity_Label_LongView">' + ev.text.split(' ')[0] + '</span></div>';
        } else {
            htmlString += '<div class="ServiceEventPadding"><span class="Capacity_Label"><i class="fa ' + typeIcon + '"></i>' + ev.text + '</span></div>';
        }
    }

    return htmlString;
}

// generate NA event html
function generateNAhtml(ev, additionalStyles, withTravel) {

    var naLabel = ev.ganttLabel || ev.reason || '';

    if (withTravel) {
        return '<div class="ServiceEvent" style="' + additionalStyles + '">\n                    <div class="ServiceEventPadding">\n                        <svg aria-hidden="true" class="slds-icon naIcon">\n                            <use xlink:href="' + lsdIcons.na + '"></use>\n                        </svg>\n                        <span class="NA_Label">\n                            ' + naLabel.encodeHTML() + '\n                        </span>\n                    </div>\n                </div>';
    }

    return '<div class="ServiceEventPadding" style="' + additionalStyles + '">\n                <svg aria-hidden="true" class="slds-icon naIcon">\n                    <use xlink:href="' + lsdIcons.na + '"></use>\n                </svg>\n                <span class="NA_Label">\n                    ' + naLabel.encodeHTML() + '\n                </span>\n            </div>';
}

// add icons to service event
function generateIconsHtmlForService(ev) {

    var iconOnShift = '';

    if (ev.violations) {
        iconOnShift = "<div class='violationsOnService'><i class='fa fa-warning'></i></div>";
    }

    if (ev.isBundleMember) {
        // cant see isBundleMember on gantt ev.isBundle
        iconOnShift = '<div class=\'violationsOnService\'>' + ev.RelatedBundle + '</div>';
    }

    if (ev.jeopardy) {
        iconOnShift = '<div class="jeopardyOnService"><img src="' + lsdIcons.jeopardyImg + '"></div>';
    }

    if (ev.icons) {

        var customIcons = '';

        ev.icons.forEach(function (url) {
            customIcons += '<div class="customIconOnService"><img src="' + url + '"></div>';
        });

        iconOnShift = iconOnShift + customIcons;
    }

    if (ev.emergency) {
        iconOnShift += '<svg aria-hidden="true" class="slds-icon emergencyOnService"><use xlink:href="' + lsdIcons.emergency + '"></use></svg>';
    }

    if (ev.pinned) {
        iconOnShift += '<svg aria-hidden="true" class="slds-icon onServiceIcon"><use xlink:href="' + lsdIcons.pin + '"></use></svg>';
    }

    if (ev.isBundle) {
        iconOnShift += '<svg aria-hidden="true" class="slds-icon onServiceIcon"><use xlink:href="' + lsdIcons.bundleIcons + '#ad_set"></use></svg>';
    }

    if (flaggedServices[ev.id]) {
        iconOnShift += '<svg aria-hidden="true" class="slds-icon onServiceIcon"><use xlink:href="' + lsdIcons.flag + '"></use></svg>';
    }

    if (ev.relatedFather || ev.relatedTo || ev.isServiceInChain) {
        iconOnShift += '<svg aria-hidden="true" class="slds-icon onServiceIcon"><use xlink:href="' + lsdIcons.related + '"></use></svg>';
    }

    if (ev.isMDT) {

        var clockIcon = '<svg aria-hidden="true" class="slds-icon onServiceIcon">\n                                <use xlink:href="' + lsdIcons.clock + '"></use>\n                            </svg>',
            forwardIcon = '<svg aria-hidden="true" class="slds-icon onServiceIcon forwardIcon">\n                                <use xlink:href="' + lsdIcons.forward + '"></use>\n                            </svg>';

        iconOnShift += clockIcon + forwardIcon;
    }

    return iconOnShift;
}

// decide on event color and font size
function generateServiceColorAndFont(ev) {

    var additionalStyles = '';

    if (ev.type === 'na' && ev.ganttColor && ev.travelTo) {
        additionalStyles += 'margin-right:-6px;';
    }

    if ((ev.ganttPaletteColor || ev.ganttColor) && !globalSelectedGanttServices[ev.id]) {

        var serviceBackgroundColor = ev.ganttColor;

        if (paletteViewActive && ev.ganttPaletteColor) {
            serviceBackgroundColor = ev.ganttPaletteColor.color;
        }

        if (serviceBackgroundColor) {
            var textColor = generateGanttTextColor(serviceBackgroundColor.substr(1, 7));
            additionalStyles += 'color:#' + textColor + ';background:' + serviceBackgroundColor + ';';
        }
    }

    // extra small font size for level 4/5/6
    if (scheduler._mode !== 'ZoomLevel3' && scheduler._mode !== 'ZoomLevel2') {
        additionalStyles += 'font-size:10px;';
    }

    return additionalStyles;
}

var __lockedServicesIds = {};

function attchDatalessSchedulerEvents() {

    // fix for show event when the resolution is less than a day
    scheduler.date.ZoomLevel1_start = function (date) {
        var day = scheduler.date.day_start(new Date(date));
        day.setHours(date.getHours());
        return day;
    };

    scheduler.date.ZoomLevel2_start = function (date) {
        var day = scheduler.date.day_start(new Date(date));
        day.setHours(date.getHours());
        return day;
    };

    // change event text - travel time, violations and jeopardy
    scheduler.templates.event_bar_text = function (start, end, ev) {

        var startPoint = void 0,
            endPoint = void 0,
            meetingLength = void 0,
            startPointTravelTo = void 0,
            endPointTravelTo = void 0,
            meetingLengthTravelTo = void 0,
            businessHours = getMinAndMaxHoursToDisplay(),
            realDuration = ev.finish - ev.start,
            startTraveless = new Date(start),
            endTraveless = void 0;

        // ---[SA1]--[SA2]---
        // Dragging SA1 will make SA2 stick to it
        // if (scheduler.getState().drag_id === ev.id && ev.relatedService2 && ev.relationshipType === 'Immediately Follow') {
        //
        //     if (scheduler._lastDateDragStart) {
        //         scheduler._lastDateDragDiff = (scheduler._lastDateDragStart.getTime() - start.getTime()) / 1000 / 60;
        //     }
        //
        //     let relatedEvent = scheduler._events[ev.relatedService2];
        //
        //     if (relatedEvent) {
        //
        //         if (!__relatedDragEventBeforeDrag) {
        //             __relatedDragEventBeforeDrag = angular.copy(relatedEvent);
        //         }
        //
        //         relatedEvent.start_date = new Date(start);
        //         relatedEvent.end_date = new Date(end);
        //
        //         relatedEvent.start_date.setMinutes( relatedEvent.start_date.getMinutes() + relatedEvent.DurationInMinutes );
        //         relatedEvent.end_date.setMinutes(relatedEvent.end_date.getMinutes() + relatedEvent.DurationInMinutes );
        //         relatedEvent.resourceId = ev.resourceId;
        //         relatedEvent.snapToId = ev.id;
        //         relatedEvent.travelTo = 0;
        //         relatedEvent.travelFrom = 0;
        //
        //         scheduler.templates.event_bar_text(relatedEvent.start_date, relatedEvent.end_date, relatedEvent);
        //
        //         scheduler.updateEvent(ev.relatedService2)
        //
        //     }
        //
        // }


        // this will move the services to the same resource and same ratio of time moving (MOVING FIRST SERVICE)
        // if (scheduler.getState().drag_id === ev.id && ev.relatedService1) {
        //
        //     if (scheduler._lastDateDragStart) {
        //         scheduler._lastDateDragDiff = (scheduler._lastDateDragStart.getTime() - start.getTime()) / 1000 / 60;
        //     }
        //
        //     scheduler._lastDateDragStart = new Date(start);
        //
        //     let relatedEvent = scheduler._events[ev.relatedService1];
        //
        //     // relatedEvent.start_date = new Date(start);
        //     // relatedEvent.end_date = new Date(end);
        //
        //     relatedEvent.start_date.setMinutes( relatedEvent.start_date.getMinutes() - scheduler._lastDateDragDiff);
        //     relatedEvent.end_date.setMinutes(relatedEvent.end_date.getMinutes() - scheduler._lastDateDragDiff );
        //     relatedEvent.resourceId = ev.resourceId;
        //
        //     scheduler.templates.event_bar_text(relatedEvent.start_date, relatedEvent.end_date, relatedEvent);
        //
        //     scheduler.updateEvent(ev.relatedService1);
        // }


        startTraveless.setSeconds(0);

        if (ev.travelTo) {
            startTraveless.setSeconds(startTraveless.getSeconds() + ev.travelTo);
        }

        endTraveless = new Date(startTraveless.getTime() + realDuration);

        // currently dragging an event - need to show the box that indicates dragging times
        showTimesWhenDragging(start, ev);

        // contractor event
        if (ev.type === 'contractorcapacity') {
            return generateCapacityHtml(ev);
        }

        // generate which icons to show on service
        var iconOnShift = generateIconsHtmlForService(ev);

        // colors and fonts for service
        var additionalStyles = generateServiceColorAndFont(ev);

        // Check if actual event should be displayed or only it's travel
        // example: end time: 6:55, travel 20mins, business hour start: 7:00 -> we should only see the travel, not the appointmnet
        var appointmentIntersecting = true;

        var schedulerMinDateWithBizHour = new Date(scheduler._min_date),
            schedulerMaxDateWithBizHour = new Date(scheduler._max_date);

        schedulerMinDateWithBizHour.setHours(businessHours.min);
        schedulerMaxDateWithBizHour.setHours(businessHours.max);

        if (!isIntersect(startTraveless, endTraveless, schedulerMinDateWithBizHour, schedulerMaxDateWithBizHour) && scheduler._mode !== 'ZoomLevel2') {
            appointmentIntersecting = false;
        }

        // Old check is old - bug FSL-510
        // if ((isIntersect(startTraveless, endTraveless, scheduler._min_date, scheduler._max_date)) && (scheduler._mode !== 'ZoomLevel2')) {
        //
        //     let checkEndHour = endTraveless.getHours() || 24;
        //
        //     checkEndHour += 24 * (moment(endTraveless).startOf('day').diff(moment(startTraveless).startOf('day'), 'days'));
        //
        //     if (!isIntersect(startTraveless.getHours(), checkEndHour, businessHours.min, businessHours.max) && scheduler._drag_id !== ev.id) {
        //         appointmentIntersecting = false;
        //     }
        //
        // }


        if (appointmentIntersecting && (ev.travelTo || ev.travelFrom)) {

            // get real points of meeting
            startPoint = getXPositionOfEvent({ start_date: startTraveless, end_date: endTraveless }, false, scheduler.matrix[scheduler._mode]);
            endPoint = getXPositionOfEvent({ start_date: startTraveless, end_date: endTraveless }, true, scheduler.matrix[scheduler._mode]);
            meetingLength = endPoint - startPoint + 12;

            if (meetingLength <= 2) {
                meetingLength = 3;
            }

            additionalStyles += 'width:' + meetingLength + 'px;';

            // if we have both travel to and from
            if (ev.travelTo) {

                // calculate current travel to (might change when being dragged, only this can affect the display)
                var newTravelTo = new Date(start);
                var rtlDirection = document.querySelector('html').getAttribute('dir') === 'rtl';

                newTravelTo.setMinutes(newTravelTo.getMinutes() + ev.travelTo / 60);

                startPointTravelTo = getXPositionOfEvent({ start_date: ev.start_date, end_date: newTravelTo }, false, scheduler.matrix[scheduler._mode]);
                endPointTravelTo = getXPositionOfEvent({ start_date: ev.start_date, end_date: newTravelTo }, true, scheduler.matrix[scheduler._mode]);

                meetingLengthTravelTo = endPointTravelTo - startPointTravelTo + 7;
                var margin = rtlDirection ? 'margin-right:' : 'margin-left:';

                // additionalStyles += 'margin-left:' + meetingLengthTravelTo + 'px;';
                additionalStyles += margin + meetingLengthTravelTo + 'px;';
            }

            // NA with travel
            if (ev.type === 'na') {
                return generateNAhtml(ev, additionalStyles, true);
            }

            // break event
            if (ev.type === 'break') {
                return generateBreakEventHtml(ev, additionalStyles, true);
            }

            return '<div class="ServiceEvent" territory_id="' + ev.getGanttTerritory() + '" style="' + additionalStyles + '");"><div class="ServiceEventPadding">' + iconOnShift + ev.text + '</div></div>';
        }

        // NA without travel
        if (ev.type === 'na') {
            return generateNAhtml(ev, additionalStyles, false);
        }

        if (ev.type === 'break') {
            return generateBreakEventHtml(ev, additionalStyles, false);
        }

        // don't draw anything but travel if only travel time should be displayed
        var eventInnerStuff = iconOnShift + ev.text;

        if (!appointmentIntersecting && !ev.isDummy) eventInnerStuff = '';

        return '<div class="ServiceEventPadding" style="' + additionalStyles + '">' + eventInnerStuff + '</div>';
    };

    // set class for services
    scheduler.templates.event_class = function (start, end, ev) {

        var cssClass = '';

        if (ev.type === 'break' && window.__servicesInFilter && window.__servicesInFilter.applied) {
            cssClass = 'NA_Break service-faded';
        } else if (ev.type === 'break') {
            cssClass = 'NA_Break ';
        }

        if (ev.showEventPopupEffect) {
            cssClass += ' ShowEventEffect ';
        }

        if (window.__servicesInFilter && window.__servicesInFilter.applied && !window.__servicesInFilter[ev.id] && !ev.isDummy) {
            cssClass += ' service-faded ';
        }

        if (ev.type === 'na') cssClass += ' NA_Absence ';

        if (ev.type === 'na' && ev.ganttColor && !ev.travelTo) cssClass += ' na_with_color_no_travel_to ';

        if (ev.type === 'na' && ev.ganttColor && ev.travelTo) cssClass += ' na_with_color ';

        if (ev.type === 'contractorcapacity') {

            cssClass += ' eventContractorCapacity';
            if (scheduler._mode === 'LongView' || scheduler._mode === 'MonthlyView') {
                cssClass += ' eventContractorCapacity_LongView';
            }

            if (ev.hoursPerTimePeriod > 0) {
                if (ev.hoursInUse > 0 && ev.hoursInUse > ev.hoursPerTimePeriod) cssClass += ' overCapacityPattern';
            } else if (ev.workItemsPerTimePeriod > 0) {
                if (ev.workItemsAllocated > 0 && ev.workItemsAllocated > ev.workItemsPerTimePeriod) cssClass += ' overCapacityPattern';
            }

            if (showCandidates.on) cssClass += ' fadedSlot';

            return cssClass;
        }

        // add classes based on statuses
        if (ev.type === 'service') {
            cssClass += getClassByStatus(ev.statusCategory);

            if (ev.isDummy || __lockedServicesIds[ev.id]) {
                cssClass += ' savingDummyService ';
            }
        }

        if (ev.isMDT) cssClass += ' mdtEvent';

        if (showCandidates.on && ev.id !== showCandidates.id) cssClass += ' fadedSlot';

        if (ev.hiddenTravelFrom) cssClass += ' dhx_long_travel_from_time_background';

        if (ev.hiddenTravelTo) cssClass += ' dhx_long_travel_to_time_background';

        // both travel from and to
        if (ev.travelTo && ev.travelFrom) cssClass += ' dhx_travelToFrom dhx_travel_time_background';

        // only travel to
        else if (ev.travelTo && !ev.travelFrom) {
                cssClass += ' dhx_travelTo dhx_travel_time_background';
            }

            // only travel from
            else if (!ev.travelTo && ev.travelFrom) {
                    cssClass += ' dhx_travelFrom dhx_travel_time_background';
                } else if (ev.type === 'na') {
                    cssClass += ' NA_Absence_NoTravel';
                } else {
                    cssClass += ' dhx_noTravel';
                }

        // check if selected
        if (ev.type === 'service') {
            if (globalSelectedGanttServices[ev.id] && (ev.travelTo || ev.travelFrom)) cssClass += ' selectedEvent';else if (globalSelectedGanttServices[ev.id]) cssClass += ' selectedEventNoTravel';else if (ev.id === scheduler._select_id && (ev.travelTo || ev.travelFrom)) cssClass += ' selectedEvent';else if (ev.id === scheduler._select_id) cssClass += ' selectedEventNoTravel';
        }

        if (ev.status) {
            cssClass += ' GanttCustomStatus_' + ev.status.split(' ').join('');
        }

        return cssClass;
    };

    // tooltip text
    scheduler.templates.tooltip_text = function (start, end, event) {

        // show only if context menu is hidden
        if (contextShown) {
            return false;
        }

        var typeIcon = void 0,
            tooltip = '<div class="tooltipBody">',
            locationId = getLocationdIdByResource(event.resourceId),
            offsetRealTime = utils.getLocationOffset(start, locationId) - utils.getUserOffset(start),
            realStartTime = new Date(event.start),
            hoursWidth = 0,
            percentage = 0,
            realFinishTime = new Date(event.finish);

        if (!locationId) {
            return false;
        }

        realStartTime.setMinutes(realStartTime.getMinutes() + offsetRealTime);
        realFinishTime.setMinutes(realFinishTime.getMinutes() + offsetRealTime);

        if (event.type === 'contractorcapacity') {
            typeIcon = 'fa-battery-empty';
            if (event.hoursPerTimePeriod > 0) {
                hoursWidth = event.hoursInUse / event.hoursPerTimePeriod * 100;
                percentage = Math.floor(event.hoursInUse / event.hoursPerTimePeriod * 100 * 100) / 100;
            } else if (event.workItemsPerTimePeriod > 0) {
                hoursWidth = event.workItemsAllocated / event.workItemsPerTimePeriod * 100;
                percentage = Math.floor(event.workItemsAllocated / event.workItemsPerTimePeriod * 100 * 100) / 100;
            }

            if (hoursWidth <= 25) {
                typeIcon = 'fa-battery-empty';
            } else if (hoursWidth <= 50) {
                typeIcon = 'fa-battery-quarter';
            } else if (hoursWidth <= 75) {
                typeIcon = 'fa-battery-half';
            } else if (hoursWidth <= 90) {
                typeIcon = 'fa-battery-three-quarters';
            } else {
                typeIcon = 'fa-battery-full';
            }

            tooltip += '<div class="tooltipLine"><b style="font-size:15px"><i class="fa ' + typeIcon + '"></i> ' + event.resourceName.encodeHTML() + '</b> (' + percentage + '%)</div>';

            if (event.workItemsPerTimePeriod) {
                tooltip += '<div class="tooltipLine">' + customLabels.NumServicesScheduled.replaceAll(event.workItemsAllocated, event.workItemsPerTimePeriod) + '</div>';
            }

            if (event.hoursPerTimePeriod) {
                tooltip += '<div class="tooltipLine">' + customLabels.NumHoursScheduled.replace('{0}', event.hoursInUse).replace('{1}', event.hoursPerTimePeriod) + '</div>';
            }

            tooltip += '<div class="tooltipHR"></div>';
            tooltip += '<div class="tooltipLine"><span class="tooltipCell tooltipCell">' + customLabels.Start + '</span> ' + moment(event.start_date).format('llll') + '</div>';
            tooltip += '<div class="tooltipLine"><span class="tooltipCell tooltipCell">' + customLabels.Finish + '</span> ' + moment(event.end_date).format('llll') + '</div>';
            tooltip += '<div class="tooltipLine"><span class="tooltipCell tooltipCell">' + customLabels.Duration_Type + '</span> ' + event.timePeriod + '</div>';

            if (event.workItemsAllocated > 0) tooltip += '<div class="tooltipLine"><span class="tooltipCell tooltipCell">' + customLabels.NumberOfServices + '</span> ' + event.workItemsAllocated + '</div>';

            tooltip += '</div>'; // of tooltipBody

            return tooltip;
        }

        if (event.type !== 'service') {

            typeIcon = absenceTypeIcon(event.type);

            if (event.ganttLabel) {
                tooltip += '<div class="tooltipLine"><b>' + typeIcon + '<span class="tooltipName">' + event.ganttLabel.encodeHTML() + '</span> </b> </div>';
            } else {
                tooltip += '<div class="tooltipLine"><b>' + typeIcon + '<span class="tooltipName">' + event.name + '</span> </b> </div>';
            }

            tooltip += '<div class="tooltipHR"></div>';
            tooltip += '<div class="tooltipLine"><span class="tooltipCell tooltipCell">' + customLabels.Start + '</span> ' + moment(event.start).format('llll') + '</div>';
            tooltip += '<div class="tooltipLine"><span class="tooltipCell tooltipCell">' + customLabels.Finish + '</span> ' + moment(event.finish).format('llll') + '</div>';

            if (offsetRealTime && !useLocationTimezone) {
                tooltip += '<div class="tooltipLine"><span class="tooltipCell tooltipCell">' + customLabels.Resource_start + '</span> ' + moment(realStartTime).format('llll') + '</div>';
                tooltip += '<div class="tooltipLine"><span class="tooltipCell tooltipCell">' + customLabels.Resource_finish + '</span> ' + moment(realFinishTime).format('llll') + '</div>';
            }

            if (event.travelTo) {
                tooltip += '<div class="tooltipLine"><span class="tooltipCell tooltipCell">' + customLabels.Travel_to + '</span> ' + generateHoursMinutes(event.travelTo / 60) + '</div>';
            }

            if (event.travelFrom) {
                tooltip += '<div class="tooltipLine"><span class="tooltipCell tooltipCell">' + customLabels.Travel_from + '</span> ' + generateHoursMinutes(event.travelFrom / 60) + '</div>';
            }

            if (event.reason || event.comment) {
                tooltip += '<div class="tooltipHR"></div>';
            }

            if (event.reason) {
                tooltip += '<div class="tooltipLine"><span class="tooltipCell tooltipCell">' + customLabels.Reason + '</span> ' + event.reason.encodeHTML() + '</div>';
            }

            tooltip += '</div>'; // of tooltipBody

            return tooltip;
        }

        // service tooltip
        var tooltipGanttColorBox = '',
            serviceBackgroundColor = event.ganttColor,
            jeopardyIcon = '<svg aria-hidden="true" class="slds-icon tooltipJeopardyIcon">\n                                <use xlink:href="' + lsdIcons.jeopardy + '"></use>\n                            </svg>',
            clockIcon = '<svg aria-hidden="true" class="slds-icon tooltipMDTIcon">\n                                <use xlink:href="' + lsdIcons.clock + '"></use>\n                            </svg>',
            forwardIcon = '<svg aria-hidden="true" class="slds-icon tooltipMDTArrowIcon">\n                                <use xlink:href="' + lsdIcons.forward + '"></use>\n                            </svg>',
            emergencyIcon = '<svg aria-hidden="true" class="slds-icon tooltipMDTArrowIcon">\n                                <use xlink:href="' + lsdIcons.emergency + '"></use>\n                            </svg>';

        if (paletteViewActive && event.ganttPaletteColor) {
            serviceBackgroundColor = event.ganttPaletteColor.color;
        }

        if (serviceBackgroundColor) {
            tooltipGanttColorBox = 'style="background:' + serviceBackgroundColor + '"';
        }

        if (event.ganttLabel) tooltip += '<div class="tooltipLine"><div ' + tooltipGanttColorBox + ' class="tooltipStatus ' + getClassByStatus(event.statusCategory) + '"></div><b style="font-size:15px">' + event.name + ' / ' + event.ganttLabel.encodeHTML() + '</b> (' + statusTranslations[event.status] + ')</div>';else tooltip += '<div class="tooltipLine"><div ' + tooltipGanttColorBox + ' class="tooltipStatus ' + getClassByStatus(event.statusCategory) + '"></div><b style="font-size:15px">' + event.name + '</b> (' + statusTranslations[event.status] + ')</div>';

        if (event.jeopardy && event.jeopardyReason) tooltip += '<div class="tooltipJeopardy">' + jeopardyIcon + '<span>' + customLabels.JeopardyTooltip + ' ' + event.jeopardyReason.encodeHTML() + '</span></div>';

        if (event.emergency) tooltip += '<div class="tooltipJEmergency">' + emergencyIcon + '<span>' + customLabels.ScheduledWithEmergency + '</span></div>';else if (event.jeopardy) tooltip += '<div class="tooltipJeopardy">' + jeopardyIcon + '<span>' + customLabels.JeopardyTooltipLong + '</span></div>';

        if (event.pinned) tooltip += '<div class="tooltipLine tooltipPinned"><i>' + customLabels.Pinned_Tooltip + '</i></div>';

        var serviceTooltipFieldSet = GanttService.prototype.allFieldSets.GanttToolTip;

        if (serviceTooltipFieldSet) {

            for (var _i = 0; _i < serviceTooltipFieldSet.length; _i++) {

                var val = event[serviceTooltipFieldSet[_i].APIName];
                if (val && (serviceTooltipFieldSet[_i].Type === 'STRING' || serviceTooltipFieldSet[_i].Type === 'TEXTAREA' || serviceTooltipFieldSet[_i].Type === 'REFERENCE' || serviceTooltipFieldSet[_i].Type === 'PICKLIST')) {
                    val = val.encodeHTML();
                }

                if (serviceTooltipFieldSet[_i].APIName === 'Status') val = statusTranslations[event.status];else if (serviceTooltipFieldSet[_i].Type === 'DATETIME' && val) {
                    val = moment(val).format('llll');
                } else if (serviceTooltipFieldSet[_i].Type === 'DATE' && val) {
                    val = moment(val).format('L');
                } else if (serviceTooltipFieldSet[_i].Type === 'BOOLEAN') {
                    val = !!val ? customLabels.True : customLabels.False;
                }

                if (val || serviceTooltipFieldSet[_i].Type === 'BOOLEAN') {
                    tooltip += '<div class="tooltipLine"><b>' + serviceTooltipFieldSet[_i].Label.encodeHTML() + ': </b> ' + val + '</div>';
                }
            }
        }

        tooltip += '<div class="tooltipHR"></div>';

        tooltip += '<div class="tooltipLine"><span class="tooltipCell truncate">' + customLabels.Start + '</span> ' + moment(event.start).format('llll') + '</div>';
        tooltip += '<div class="tooltipLine"><span class="tooltipCell truncate">' + customLabels.Finish + '</span> ' + moment(event.finish).format('llll') + '</div>';

        if ((offsetRealTime || alwaysShowLocalTimeTooltip) && !useLocationTimezone) {
            tooltip += '<div class="tooltipLine"><span class="tooltipCell truncate">' + customLabels.Resource_start + '</span> ' + moment(realStartTime).format('llll') + '</div>';
            tooltip += '<div class="tooltipLine"><span class="tooltipCell truncate">' + customLabels.Resource_finish + '</span> ' + moment(realFinishTime).format('llll') + '</div>';
        }

        if (event.hiddenTravelTo) tooltip += '<div class="tooltipLine"><span class="tooltipCell truncate">' + customLabels.Travel_to + '</span> ' + generateHoursMinutes(event.hiddenTravelTo.hiddenTravel / 60) + '</div>';else if (event.travelTo) tooltip += '<div class="tooltipLine"><span class="tooltipCell truncate">' + customLabels.Travel_to + '</span> ' + generateHoursMinutes(event.travelTo / 60) + '</div>';

        if (event.hiddenTravelFrom) tooltip += '<div class="tooltipLine"><span class="tooltipCell truncate">' + customLabels.Travel_from + '</span> ' + generateHoursMinutes(event.hiddenTravelFrom.hiddenTravel / 60) + '</div>';else if (event.travelFrom) tooltip += '<div class="tooltipLine"><span class="tooltipCell truncate">' + customLabels.Travel_from + '</span> ' + generateHoursMinutes(event.travelFrom / 60) + '</div>';

        if (event.tooltipText) {
            tooltip += '<div class="tooltipHR"></div>';
            tooltip += '<div class="tooltipLine tooltipTitle">' + customLabels.Custom_Tooltip_Field + '</div><div class="tooltipLine">' + event.tooltipText.encodeHTML() + '</div>';
        }

        tooltip += '</div>'; // tooltipBody

        if (event.hiddenTravelTo || event.hiddenTravelFrom || event.isMDT) {
            tooltip += '<div class="tooltipTravel">';
            if (event.hiddenTravelTo || event.hiddenTravelFrom) {
                tooltip += '<div class="tooltipLine tooltipTitle"><i class="fa fa-car"></i>' + customLabels.Travel_time + '</div><div>';
                tooltip += customLabels.Travel_time_too_long.replace('{0}', maxTravelTimeInSeconds / 60 / 60) + '<div class="travelExplain">' + customLabels.To_change_maximum_travel_hours + '</div>';
                tooltip += '</div>';
            }
            if (event.isMDT) {
                tooltip += '<div class="tooltipLine tooltipTitle">' + clockIcon + forwardIcon + customLabels.Multi_Day_Service + '</div><div>';
                tooltip += customLabels.This_service_spans_across_more_than_one_day;
                tooltip += '</div>';
            }
            tooltip += '</div>';
        }

        if (event.violations) {

            tooltip += '<div class="tooltipViolation">';
            tooltip += '<div class="tooltipLine tooltipTitle"><i class="fa fa-warning"></i>' + customLabels.Rule_violations_Tooltip + '</div><div>';

            for (var i = 0; i < event.violations.length; i++) {
                if (event.violations[i].ViolationString.indexOf(violationDelimiter) != -1) {
                    tooltip += event.violations[i].RuleName + ' - ';
                    tooltip += event.violations[i].ViolationString.substring(0, event.violations[i].ViolationString.indexOf(violationDelimiter)) + '<br/>';
                    tooltip += event.violations[i].ViolationString.substring(event.violations[i].ViolationString.indexOf(violationDelimiter) + violationDelimiter.length) + '<br/>';
                } else tooltip += event.violations[i].RuleName + ' - ' + event.violations[i].ViolationString + '<br/>';
            }

            tooltip += '</div>';
        }

        return tooltip;
    };

    // don't let the user drag event out of the scheduler
    var cancelDragOutOfBound = false;

    // cancel drag outside of scheduler (invoke when mouse is out)
    dhtmlxEvent(scheduler._obj, 'mouseleave', function (e) {
        if (scheduler.getState().drag_id) {
            cancelDragOutOfBound = true;
            scheduler._on_mouse_up(e);
            cachedDomElements.timesDragFix.hide();
            window.getSelection().removeAllRanges(); // clear text selection on IE
        }
    });

    // cancel drag outside, move event back to its original
    scheduler.attachEvent('onBeforeEventChanged', function () {
        if (cancelDragOutOfBound) {
            cancelDragOutOfBound = false;
            return false;
        }

        return true;
    });

    scheduler._hover = null; // currently hovering

    scheduler.attachEvent('onMouseMove', function (id, e) {

        if (!id) {

            if (scheduler._hover) {
                $('.dhx_cal_event_line, .ServiceEvent').removeClass('hoverRelated');
                scheduler._hover = null;
            }

            return;
        }

        if (scheduler._events[id] && (scheduler._events[id].relatedTo || scheduler._events[id].relatedFather)) {

            var current = $(scheduler.getRenderedEvent(id)).find('.ServiceEvent'),
                brother = null;

            if (current.length === 0) current = $(scheduler.getRenderedEvent(id));

            if (scheduler._events[id].relatedFather) {
                brother = $(scheduler.getRenderedEvent(scheduler._events[id].relatedFather)).find('.ServiceEvent');

                if (brother.length === 0) brother = $(scheduler.getRenderedEvent(scheduler._events[id].relatedFather));
            } else {
                brother = $(scheduler.getRenderedEvent(scheduler._events[id].relatedTo)).find('.ServiceEvent');

                if (brother.length === 0) brother = $(scheduler.getRenderedEvent(scheduler._events[id].relatedTo));
            }

            scheduler._hover = id;

            if (current && brother) {

                if ($(current).hasClass('hoverRelated')) // already drawn
                    return;

                $(current).addClass('hoverRelated');
                $(brother).addClass('hoverRelated');
            }
        }
    });

    scheduler.templates.ZoomLevel2_scale_date = function (date) {

        var hours = date.getHours(),
            minutes = date.getMinutes() < 10 ? formatNumberToLocaleString(0) + formatNumberToLocaleString(date.getMinutes()) : formatNumberToLocaleString(date.getMinutes());

        if (!isAMPM) {
            return formatNumberToLocaleString(hours) + ':' + minutes;
        } else {
            if (hours === 0) return formatNumberToLocaleString(12) + ':' + minutes + ' AM';

            if (hours === 12) return formatNumberToLocaleString(12) + ':' + minutes + ' PM';

            if (hours > 12) return formatNumberToLocaleString(hours - 12) + ':' + minutes + ' PM';else return formatNumberToLocaleString(hours) + ':' + minutes + ' AM';
        }
    };

    scheduler.templates.ZoomLevel3_scale_date = function (date) {

        var hours = date.getHours();

        var minutes = date.getMinutes() < 10 ? formatNumberToLocaleString(0) + formatNumberToLocaleString(date.getMinutes()) : formatNumberToLocaleString(date.getMinutes());

        if (!isAMPM) {
            return (date.getHours() < 10 ? formatNumberToLocaleString(0) + formatNumberToLocaleString(date.getHours()) : formatNumberToLocaleString(date.getHours())) + ':' + minutes;
        } else {
            if (hours === 0) return formatNumberToLocaleString(12) + ' AM';

            if (hours == 12) return formatNumberToLocaleString(12) + ' PM';

            if (hours > 12) return formatNumberToLocaleString(hours - 12) + ' PM';else return formatNumberToLocaleString(hours) + ' AM';
        }
    };

    scheduler.templates.ZoomLevel4_scale_date = scheduler.templates.ZoomLevel3_scale_date;
    scheduler.templates.ZoomLevel5_scale_date = scheduler.templates.ZoomLevel3_scale_date;
    scheduler.templates.ZoomLevel6_scale_date = scheduler.templates.ZoomLevel3_scale_date;
    scheduler.templates.ZoomLevel7_scale_date = scheduler.templates.ZoomLevel3_scale_date;

    // enable this if long term has scrollable = true
    // scheduler.templates.LongView_scale_date = function(date) {
    //     return moment(date).format('MMM, D').toUpperCase();
    // };


    scheduler.templates.ZoomLevel4_cell_class = function (evs, date, section) {

        var classes = '';

        if (!section.children && shouldSeparateCell(date)) {
            classes += 'BorderForDayChange ';
        }

        // Weekened coloring
        var currentDay = date.getDay();

        if (!section.children && window.__currentViewOptions.highlightWeekeneds) {

            // SAT
            if (currentDay === 6) {
                classes += ' color-weekends';
            }

            // SUN
            else if (currentDay === 0 && window.firstDayOfTheWeek === 1) {
                    classes += ' color-weekends';
                }

                // FRI
                else if (currentDay === 5 && window.firstDayOfTheWeek === 0) {
                        classes += ' color-weekends';
                    }
        }

        return classes;
    };

    scheduler.templates.ZoomLevel2_cell_class = scheduler.templates.ZoomLevel4_cell_class;
    scheduler.templates.ZoomLevel3_cell_class = scheduler.templates.ZoomLevel4_cell_class;
    scheduler.templates.ZoomLevel5_cell_class = scheduler.templates.ZoomLevel4_cell_class;
    scheduler.templates.ZoomLevel6_cell_class = scheduler.templates.ZoomLevel4_cell_class;
    scheduler.templates.ZoomLevel7_cell_class = scheduler.templates.ZoomLevel4_cell_class;
    scheduler.templates.MTDView_cell_class = scheduler.templates.ZoomLevel4_cell_class;
    scheduler.templates.LongView_cell_class = scheduler.templates.ZoomLevel4_cell_class;

    scheduler.templates.ZoomLevel4_second_scalex_class = function (date) {

        if (window.__currentViewOptions.highlightWeekeneds) {

            // Weekened coloring
            var currentDay = date.getDay();

            // SAT
            if (currentDay === 6) {
                return 'color-weekends-date';
            }

            // SUN
            else if (currentDay === 0 && window.firstDayOfTheWeek === 1) {
                    return 'color-weekends-date';
                }

                // FRI
                else if (currentDay === 5 && window.firstDayOfTheWeek === 0) {
                        return 'color-weekends-date';
                    }
        }
    };

    scheduler.templates.ZoomLevel2_second_scalex_class = scheduler.templates.ZoomLevel4_second_scalex_class;
    scheduler.templates.ZoomLevel3_second_scalex_class = scheduler.templates.ZoomLevel4_second_scalex_class;
    scheduler.templates.ZoomLevel5_second_scalex_class = scheduler.templates.ZoomLevel4_second_scalex_class;
    scheduler.templates.ZoomLevel6_second_scalex_class = scheduler.templates.ZoomLevel4_second_scalex_class;
    scheduler.templates.ZoomLevel7_second_scalex_class = scheduler.templates.ZoomLevel4_second_scalex_class;

    scheduler.templates.ZoomLevel2_scalex_class = scheduler.templates.ZoomLevel2_second_scalex_class;
    scheduler.templates.ZoomLevel3_scalex_class = scheduler.templates.ZoomLevel2_second_scalex_class;
    scheduler.templates.ZoomLevel4_scalex_class = scheduler.templates.ZoomLevel2_second_scalex_class;
    scheduler.templates.ZoomLevel5_scalex_class = scheduler.templates.ZoomLevel2_second_scalex_class;
    scheduler.templates.ZoomLevel6_scalex_class = scheduler.templates.ZoomLevel2_second_scalex_class;
    scheduler.templates.ZoomLevel7_scalex_class = scheduler.templates.ZoomLevel2_second_scalex_class;
    scheduler.templates.MTDView_scalex_class = scheduler.templates.ZoomLevel2_second_scalex_class;
    scheduler.templates.LongView_scalex_class = scheduler.templates.ZoomLevel2_second_scalex_class;
    scheduler.templates.MonthlyView_scalex_class = scheduler.templates.ZoomLevel2_second_scalex_class;

    scheduler.filter_ZoomLevel1 = filterEvents;
    scheduler.filter_ZoomLevel2 = filterEvents;
    scheduler.filter_ZoomLevel3 = filterEvents;
    scheduler.filter_ZoomLevel4 = filterEvents;
    scheduler.filter_ZoomLevel5 = filterEvents;
    scheduler.filter_ZoomLevel6 = filterEvents;
    scheduler.filter_ZoomLevel7 = filterEvents;

    scheduler.filter_LongView = function filterEventsLongTerm(id, ev) {
        var shouldCheckCapacity = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;


        // always show capacities
        if (ev instanceof ResourceCapacity && ev.timePeriod === capacityDurationFilter) {
            return true;
        }

        if (shouldCheckCapacity && contractorSupport && ev.resourceContractor) {
            return false;
        }

        if (window.__gantt.shouldShowLongTermError()) {
            return false;
        }

        // hide breaks
        if (ev.type === 'break') {
            return false;
        }

        var eventLengthInHours = (ev.finish - ev.start) / 1000 / 60 / 60;

        if (window.__currentViewOptions.showMdt) {

            // remove FSL__ prefix
            var mdtField = window.mdtBooleanField.indexOf('FSL__') === 0 ? window.mdtBooleanField.substr(5, window.mdtBooleanField.length - 5) : window.mdtBooleanField;

            return ev.type === 'na' && eventLengthInHours >= window.__currentViewOptions.minNaDuration || ev.type === 'service' && eventLengthInHours >= window.__currentViewOptions.minServiceDuration && ev.fields[mdtField];
        }

        return ev.type === 'na' && eventLengthInHours >= window.__currentViewOptions.minNaDuration || ev.type === 'service' && eventLengthInHours >= window.__currentViewOptions.minServiceDuration;
    };

    scheduler.filter_MonthlyView = function (id, ev) {
        return ev.type === 'contractorcapacity' && ev.timePeriod === capacityDurationFilter;
    };

    scheduler.filter_MTDView = function (id, ev) {
        return ev.type === 'contractorcapacity' && ev.timePeriod === capacityDurationFilter || ev.isMDT || ev.type === 'na';
    };

    scheduler.ignore_ZoomLevel3 = ignoreHours;
    scheduler.ignore_ZoomLevel4 = ignoreHours;
    scheduler.ignore_ZoomLevel5 = ignoreHours;
    scheduler.ignore_ZoomLevel6 = ignoreHours;
    scheduler.ignore_ZoomLevel7 = ignoreHours;

    scheduler.ignore_MonthlyView = function (date) {
        return isDateInsideWeekend(date);
    };

    scheduler.ignore_LongView = scheduler.ignore_MonthlyView;
    scheduler.ignore_MTDView = scheduler.ignore_MonthlyView;

    function ignoreHours(date) {

        if (isDateInsideWeekend(date)) {
            return true;
        }

        var minAndMaxHours = getMinAndMaxHoursToDisplay();

        return !(date.getHours() >= minAndMaxHours.min && date.getHours() < minAndMaxHours.max);
    }

    function isDateInsideWeekend(date) {
        if (scheduler._mode === 'ZoomLevel6' || scheduler._mode === 'ZoomLevel7' || scheduler._mode === 'MonthlyView' || scheduler._mode === 'MTDView' || scheduler._mode === 'LongView') {
            var second = firstDayOfTheWeek === 0 ? 6 : 0,
                first = firstDayOfTheWeek === 0 ? 5 : 6;

            if (!includeWeekends && (date.getDay() === first || date.getDay() === second)) {
                return true;
            }
        }

        return false;
    }
    function areTwoDatesInSameWeekend(dateStart, dateFinish) {
        return (dateFinish.getTime() / 1000 / 60 / 60 - dateStart.getTime() / 1000 / 60 / 60) / 24 < 5;
    }

    function filterEventByTime(event) {

        var minAndMaxHours = getMinAndMaxHoursToDisplay();

        if (isDateInsideWeekend(event.start_date) && isDateInsideWeekend(event.end_date) && areTwoDatesInSameWeekend(event.start_date, event.end_date)) {
            return false;
        }

        var schedulerDays = [];

        // in-day mode - no multiple days or special treatment
        if (scheduler._mode === "ZoomLevel2") {
            schedulerDays.push({
                start: scheduler._min_date.getTime(),
                finish: scheduler._max_date.getTime()
            });
        } else {

            var startingTiks = scheduler._min_date.getTime(),
                finishTicks = scheduler._max_date.getTime();

            for (var i = startingTiks; i < finishTicks; i += 86400000) {

                var currentEventObj = {
                    start: i + minAndMaxHours.min * 1000 * 60 * 60,
                    finish: i + minAndMaxHours.max * 1000 * 60 * 60
                };

                schedulerDays.push(currentEventObj);
            }
        }

        return isMultipleIntersection({ start: event.start_date.getTime(), finish: event.end_date.getTime() }, schedulerDays);
    }

    function getMinAndMaxHoursToDisplay() {

        var currLevel = scheduler.getState().mode,
            minHour = minHourToDisplay,
            maxHour = maxHourToDisplay;

        var numOfHoursInCell = null;

        switch (currLevel) {
            case 'ZoomLevel4':
                numOfHoursInCell = 2;
                break;

            case 'ZoomLevel5':
                numOfHoursInCell = 4;
                break;

            case 'ZoomLevel6':
            case 'ZoomLevel7':
                numOfHoursInCell = 6;
                break;
        }

        if (numOfHoursInCell != null) {
            minHour -= minHour % numOfHoursInCell;

            var toAdd = numOfHoursInCell - maxHour % numOfHoursInCell;

            if (toAdd != numOfHoursInCell) {
                maxHour += toAdd;
            }
        }

        return {
            min: minHour,
            max: maxHour
        };
    }

    function filterEvents(id, event) {

        if (gameOn) return false;

        var insideTimeLine = filterEventByTime(event),
            insideContractorLimit = true;

        // unapproved na
        // if (isApprovedAbsencesSupported && event instanceof ResourceAbsence && !event.approved) {
        //     return false;
        // }

        if (contractorSupport) {
            if (event.resourceContractor) insideContractorLimit = false; // event will be filtered (not rendered)

            //show weekly capacities only in weekly mode
            if (event.type === 'contractorcapacity' && event.timePeriod != capacityDurationFilter) insideContractorLimit = false;
        }

        return insideTimeLine && insideContractorLimit; // event will be rendered
    }

    return {
        isDateInsideWeekend: isDateInsideWeekend
    };
}

function shouldSeparateCell(date) {

    var minAndMaxHours = getMinAndMaxHoursToDisplay();

    switch (scheduler._mode) {

        case 'ZoomLevel4':
            minAndMaxHours.max -= 2;
            break;

        case 'ZoomLevel5':
            minAndMaxHours.max -= 4;
            break;

        case 'ZoomLevel6':
        case 'ZoomLevel7':
            minAndMaxHours.max -= 6;
            break;
    }

    if (scheduler._mode === 'ZoomLevel2' && date.getHours() === 23 && date.getMinutes() === 30) return true;

    if (date.getHours() === minAndMaxHours.max) {

        var checkDate = new Date(date);
        checkDate.setHours(checkDate.getHours() + 24);

        if (checkDate <= scheduler._max_date) return true;
    }

    return false;
}

function getXPositionOfEvent(ev, isEndPoint, config) {
    var x = 0;
    var step = config._step;
    var round_position = config.round_position;

    var column_offset = 0;
    var date = isEndPoint ? ev.end_date : ev.start_date;

    if (date.valueOf() > scheduler._max_date.valueOf()) date = scheduler._max_date;
    var delta = date - scheduler._min_date_timeline;

    if (delta > 0) {
        var index = scheduler._get_date_index(config, date);
        if (scheduler._ignores[index]) round_position = true;

        for (var i = 0; i < index; i++) {
            x += scheduler._cols[i];
        }

        var column_date = scheduler.date.add(scheduler._min_date_timeline, scheduler.matrix[scheduler._mode].x_step * index, scheduler.matrix[scheduler._mode].x_unit);
        if (!round_position) {
            delta = date - column_date;
            if (config.first_hour || config.last_hour) {
                delta = delta - config._start_correction;
                if (delta < 0) delta = 0;
                column_offset = Math.round(delta / step);
                if (column_offset > scheduler._cols[index]) column_offset = scheduler._cols[index];
            } else {
                column_offset = Math.round(delta / step);
            }
        } else {
            if (+date > +column_date && isEndPoint) {
                column_offset = scheduler._cols[index];
            }
        }
    }

    if (isEndPoint) {
        // special handling for "round" dates which match columns and usual ones
        if (delta !== 0 && !round_position) {
            x += column_offset - 12;
        } else {
            x += column_offset - 14;
        }
    } else {
        x += column_offset + 1;
    }

    return x;
}

$(function () {

    // set locale
    moment.locale(userLocale);

    // set timeformat for scheduler
});

function getResourceEventsIds(start, end, resourceId) {

    var ids = [];

    for (var key in scheduler._events) {

        if (scheduler._events[key].type == 'service' && scheduler._events[key].start_date >= start && scheduler._events[key].end_date <= end && scheduler._events[key].resourceId == resourceId) {
            ids.push(key);

            if (scheduler._events[key].relatedTo) ids.push(scheduler._events[key].relatedTo);

            if (scheduler._events[key].relatedFather) ids.push(scheduler._events[key].relatedFather);
        }
    }

    return ids;
}

// function getEventIdsOfResources(resourceIds) {
//
//     let ids = [];
//
//     for (let key in scheduler._events) {
//         if ((scheduler._events[key].type == 'service') && (resourceIds.indexOf(scheduler._events[key].resourceId) > -1)) {
//             ids.push(key);
//
//             if (scheduler._events[key].relatedTo)
//                 ids.push(scheduler._events[key].relatedTo);
//
//             if (scheduler._events[key].relatedFather)
//                 ids.push(scheduler._events[key].relatedFather);
//         }
//     }
//
//     return ids;
// }
//
// function getEventIdsOfLocation(start, end, locationIds) {
//
//     var ids = [];
//
//     for (let key in scheduler._events) {
//
//         if ((scheduler._events[key].type == 'service') && (scheduler._events[key].start_date >= start) &&
//             (scheduler._events[key].end_date <= end) && (locationIds.indexOf(scheduler._events[key].location) > -1)) {
//             ids.push(key);
//         }
//     }
//
//     return ids;
// }


function setCapacityFilter(capacityDuration, updateView) {
    if (!contractorSupport) return;

    capacityDurationFilter = capacityDuration;

    if (updateView) {
        scheduler._is_initialized() && updateViewDebounced();
    }
}

function cantLoadGantt(message) {

    if ($('.keypressEvents')) {
        $('.bodyDiv').css('background', '#fff');
        $('.keypressEvents').remove();
        $('#ErrorLoadingGantt').show();
    }

    $('#ErrorContainer').append(message);

    if (message.toUpperCase().indexOf('CPU TIME') > -1) {

        $('#OpenTerritoryButton').show();
        $('#OpenTerritoryMessage').show();

        $('#OpenTerritoryButton').click(function () {
            __openLocationFilteringAndReload();
        });
    } else {
        $('#OpenTerritoryButton').hide();
        $('#OpenTerritoryMessage').hide();
    }
}

function getLocationdIdByResource(id) {

    var locations = scheduler.serverList('resources');

    for (var i = 0; i < locations.length; i++) {

        for (var j = 0; j < locations[i].children.length; j++) {
            if (id.split(',')[0] === locations[i].children[j].key) {
                return locations[i].key;
            }
        }
    }

    return null;
}

function absenceTypeIcon(t) {
    if (t === 'break') {
        return '<svg aria-hidden="true" class="slds-icon tooltipBreakIcon">\n                    <use xlink:href="' + lsdIcons.break + '"></use>\n                </svg>';
    }

    return '<svg aria-hidden="true" class="slds-icon tooltipNAIcon">\n                <use xlink:href="' + lsdIcons.na + '"></use>\n            </svg>';
}

function getClassByStatus(status) {

    switch (status) {

        case globalCategories.NONE:
            return 'eventStatusNew';

        case globalCategories.SCHEDULED:
            return 'eventStatusAssigned';

        case globalCategories.DISPATCHED:
            return 'eventStatusDispatched';

        case globalCategories.IN_PROGRESS:
            return 'eventStatusTravel';

        /*case globalStatuses.ONSITE:
            return 'eventStatusOnSite';*/

        case globalCategories.RUNNING_LONG:
            return 'eventStatusOnSite';

        case globalCategories.COMPLETED:
            return 'eventStatusCompleted';

        case globalCategories.MISSED:
            return 'eventStatusIncomplete';

        case globalCategories.COULD_NOT_COMPLETE:
            return 'eventStatusCouldntComplete';

        case globalCategories.CANCELED:
            return 'eventStatusCancelled';

        default:
            return 'eventCustomStatus';

    }
}

function getMinAndMaxHoursToDisplay() {

    var minHour = minHourToDisplay,
        maxHour = maxHourToDisplay,
        numOfHoursInCell = null;

    switch (scheduler._mode) {

        case 'ZoomLevel4':
            numOfHoursInCell = 2;
            break;

        case 'ZoomLevel5':
            numOfHoursInCell = 4;
            break;

        case 'ZoomLevel6':
        case 'ZoomLevel7':
            numOfHoursInCell = 6;
            break;
    }

    if (numOfHoursInCell !== null) {

        minHour -= minHour % numOfHoursInCell;

        var toAdd = numOfHoursInCell - maxHour % numOfHoursInCell;

        if (toAdd !== numOfHoursInCell) {
            maxHour += toAdd;
        }
    }

    return {
        min: minHour,
        max: maxHour
    };
}

$(function () {

    svg4everybody();

    if (typeof srcUp === 'function') {
        $('body').css('margin', '0');
    }
});

// check if 2 ranges are intersecting, can be any type you can compare
// http://stackoverflow.com/questions/325933/determine-whether-two-date-ranges-overlap
function isIntersect(a_start, a_end, b_start, b_end) {
    return a_start < b_end && a_end > b_start;
}

function isIntersectIncludeLimits(a_start, a_end, b_start, b_end) {
    return a_start <= b_end && a_end >= b_start;
}

// check if a range is in one of many given ranges
function isMultipleIntersection(range, rangeArray) {

    for (var i = 0; i < rangeArray.length; i++) {
        if (isIntersect(range.start, range.finish, rangeArray[i].start, rangeArray[i].finish)) return true;
    }

    return false;
}

function generateGanttTextColor(color) {

    var midColor = parseInt('0x888888', 16),
        newColor = parseInt('0x' + color, 16);

    if (midColor < newColor) return '000000';else return 'ffffff';
}

// format number in localeString
function formatNumberToLocaleString(n) {
    try {
        return n.toLocaleString(jsUserLocale);
    } catch (e) {
        console.warn('Something wrong with your locale settings: ' + jsUserLocale);
    }

    return n;
}

function formatDateByLocaleWithDayOfTheWeek(jsDate) {

    var res = utils.formatDateWithDayOfWeek(jsDate);

    if (res) {
        return res;
    }

    var localesToUseWithDayOfTheWeek = ['en_US'];

    if (localesToUseWithDayOfTheWeek.indexOf(userLocale) !== -1) {
        return moment(jsDate).format('ddd, MMM D YYYY');
    }

    return moment(jsDate).format('LL');
}

scheduler.attachEvent("onSchedulerReady", function () {

    scheduler.templates.ZoomLevel1_second_scale_date = function (date) {
        return formatDateByLocaleWithDayOfTheWeek(date);
    };

    scheduler.templates.MonthlyView_second_scale_date = function (date) {
        return moment(date).format('MMM');
    };

    scheduler.templates.MTDView_second_scale_date = scheduler.templates.MonthlyView_second_scale_date;
    scheduler.templates.LongView_second_scale_date = scheduler.templates.MonthlyView_second_scale_date;
    scheduler.templates.ZoomLevel2_second_scale_date = scheduler.templates.ZoomLevel1_second_scale_date;
    scheduler.templates.ZoomLevel3_second_scale_date = scheduler.templates.ZoomLevel1_second_scale_date;
    scheduler.templates.ZoomLevel4_second_scale_date = scheduler.templates.ZoomLevel1_second_scale_date;
    scheduler.templates.ZoomLevel5_second_scale_date = scheduler.templates.ZoomLevel1_second_scale_date;

    scheduler.templates.ZoomLevel6_second_scale_date = function (date) {
        return moment(date).format('ddd,  D');
    };

    scheduler.templates.ZoomLevel7_second_scale_date = scheduler.templates.ZoomLevel6_second_scale_date;

    scheduler.templates.ZoomLevel2_date = function (start, end) {

        if (start.getDate() !== end.getDate()) {
            return formatDateByLocaleWithDayOfTheWeek(start) + ' - ' + formatDateByLocaleWithDayOfTheWeek(end);
        }

        return formatDateByLocaleWithDayOfTheWeek(start);
    };

    scheduler.templates.ZoomLevel3_date = function (start, end) {
        return formatDateByLocaleWithDayOfTheWeek(start);
    };

    scheduler.templates.ZoomLevel4_date = function (start, end) {

        var endDate = new Date(end);
        endDate.setDate(endDate.getDate() - 1);

        return formatDateByLocaleWithDayOfTheWeek(start) + ' - ' + formatDateByLocaleWithDayOfTheWeek(endDate);
    };

    scheduler.templates.ZoomLevel5_date = scheduler.templates.ZoomLevel4_date;
    scheduler.templates.ZoomLevel6_date = scheduler.templates.ZoomLevel4_date;
    scheduler.templates.ZoomLevel7_date = scheduler.templates.ZoomLevel4_date;
    scheduler.templates.MonthlyView_date = scheduler.templates.ZoomLevel4_date;
    scheduler.templates.MTDView = scheduler.templates.ZoomLevel4_date;
    scheduler.templates.LongView = scheduler.templates.ZoomLevel4_date;
});

function generateHoursMinutes(timeInMinutes) {

    if (timeInMinutes < 60) {
        return customLabels.MinutesGanttTooltip.replace('$0', timeInMinutes);
    }

    var mins = timeInMinutes % 60,
        hours = Math.floor(timeInMinutes / 60);

    return customLabels.MinutesHoursGanttTooltip.replace('$0', hours).replace('$1', mins);
}

function removeLightboxLoading() {
    $('#lightbox-loading-cover').remove();
}

$(function () {
    if (window.navigator.userAgent.indexOf("Edge") > -1) {
        document.body.className += ' ' + 'EdgeBrowser';
    }
});

function __setTimeZoneOffsetToDateField(dateField) {
    var allowNulls = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    var isStart = arguments[2];

    if (dateField) {
        var tz_offset = new Date(dateField).getTimezoneOffset() * 60 * 1000;
        var tz_offsetAfter = new Date(dateField + tz_offset).getTimezoneOffset() * 60 * 1000;

        //take care of DST issues (CFSL-2062)
        var offsetToAdd = 0;
        if (tz_offset != tz_offsetAfter) {
            offsetToAdd = tz_offset - tz_offsetAfter;
        }

        return new Date(dateField + tz_offset - offsetToAdd);
    } else {
        if (allowNulls) {
            return null;
        } else {
            return isStart ? new Date(0) : new Date(2400000000000);
        }
    }
}
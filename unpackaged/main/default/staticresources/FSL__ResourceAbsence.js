'use strict';

function ResourceAbsence(sobject) {

    this.id = sobject.Id;
    this.end = sobject[fieldNames.ResourceAbsence.End];
    this.resource = sobject[fieldNames.ResourceAbsence.Resource];
    this.start = sobject[fieldNames.ResourceAbsence.Start];
    this.absenceType = sobject.TypeLabel || sobject[fieldNames.ResourceAbsence.Type] || '';
    this.reason = sobject.TypeLabel || sobject[fieldNames.ResourceAbsence.Type] || '';
    this.ganttLabel = sobject[fieldNames.ResourceAbsence.GanttLabel__c] || null;
    this.lastModifiedDate = sobject.LastModifiedDate || null;
    this.name = sobject.AbsenceNumber;
    this.resourceName = sobject[fieldNames.ResourceAbsence.Resource__r].Name;
    this.ganttColor = sobject[fieldNames.ResourceAbsence.Gantt_Color__c];
    this.approved = sobject[fieldNames.ResourceAbsence.Approved__c];
    this.latitude = sobject.Latitude;
    this.longitude = sobject.Longitude;

    // set travel time
    this.travelTo = sobject[fieldNames.ResourceAbsence.EstTravelTime__c] ? sobject[fieldNames.ResourceAbsence.EstTravelTime__c] * 60 : 0;
    this.travelFrom = sobject[fieldNames.ResourceAbsence.EstTravelTimeFrom__c] ? sobject[fieldNames.ResourceAbsence.EstTravelTimeFrom__c] * 60 : 0;

    this.sfdcType = 'absence';

    // set type
    if (sobject['RecordType'] && sobject['RecordType'].DeveloperName && sobject['RecordType'].DeveloperName == 'Non_Availability') this.type = 'na';else this.type = 'break';

    this.setSchedulerProperties();
}

ResourceAbsence.prototype.setSchedulerProperties = function () {

    // get all offsets for date fields - add when creating new javascript date
    this.start = __setTimeZoneOffsetToDateField(this.start);
    this.finish = __setTimeZoneOffsetToDateField(this.end);
    this.end = __setTimeZoneOffsetToDateField(this.end);
};

ResourceAbsence.prototype.setGanttResource = function (timephasedObjects, generateResourceId) {

    var resourceTimePhases = timephasedObjects[this.resource],
        territories = [];

    this.resourceId = null;

    // not scheduled
    if (!this.isScheduled()) {
        return;
    }

    this.start_date = this.start ? new Date(this.start.getTime()) : null;
    this.end_date = this.finish ? new Date(this.finish.getTime()) : null;

    var passesRelocation = false;
    // go over all time phases of the specific resource
    for (var tpKey in resourceTimePhases) {

        var timephase = resourceTimePhases[tpKey];
        passesRelocation = false;

        // if relocation, this will be our drawing place
        if (timephase.serviceTerritoryType === 'R' && (isIntersect(timephase.effectiveStartDate, timephase.effectiveEndDate, this.start_date, this.end_date) || !timephase.effectiveEndDate && timephase.effectiveStartDate < this.end_date)) {
            //If Absence crosses the Relocation we want him to be on both Primary and Reloction. Bug W-7554423
            if (this.end_date > timephase.effectiveEndDate && this.start_date < timephase.effectiveEndDate || this.start_date < timephase.effectiveStartDate && this.end_date > timephase.effectiveStartDate) {
                passesRelocation = true;
            }
            // if absence is intersecting with more than one STM (and the STM is for the same territory), don't draw it twice
            if (!territories.includes(timephase.serviceTerritory)) {
                territories.push(timephase.serviceTerritory);
            }
        }
    }

    // no relocation, must be primary
    if (territories.length === 0 || passesRelocation) {
        for (var _tpKey in resourceTimePhases) {

            var _timephase = resourceTimePhases[_tpKey];

            if (isIntersect(_timephase.effectiveStartDate, _timephase.effectiveEndDate, this.start_date, this.end_date) || !_timephase.effectiveEndDate && _timephase.effectiveStartDate < this.end_date) {
                // if absence is intersecting with more than one STM (and the STM is for the same territory), don't draw it twice
                if (!territories.includes(_timephase.serviceTerritory)) {
                    territories.push(_timephase.serviceTerritory);
                }
            }
        }
    }

    // if relocation - look for secondaries.
    else {
            if (showSecondarySTMs) {
                for (var _tpKey2 in resourceTimePhases) {

                    var _timephase2 = resourceTimePhases[_tpKey2];
                    if (_timephase2.serviceTerritoryType === 'S' && (isIntersect(_timephase2.effectiveStartDate, _timephase2.effectiveEndDate, this.start_date, this.end_date) || !_timephase2.effectiveEndDate && _timephase2.effectiveStartDate < this.end_date)) {
                        // if absence is intersecting with more than one STM (and the STM is for the same territory), don't draw it twice
                        if (!territories.includes(_timephase2.serviceTerritory)) {
                            territories.push(_timephase2.serviceTerritory);
                        }
                    }
                }
            }
        }

    this.resourceId = generateResourceId(this.resource, territories);

    if (this.isScheduled()) {
        this.updateDatesBasedOnTravel();
    }
};

// updates dates if we have travel
ResourceAbsence.prototype.updateDatesBasedOnTravel = function () {

    if (this.resourceId) {
        if (this.travelFrom) {
            if (this.travelFrom <= maxTravelTimeInSeconds) {
                this.end_date.setMinutes(this.end_date.getMinutes() + Math.floor(this.travelFrom / 60));
            } else {
                //this.end_date.setMinutes(this.end_date.getMinutes() + 60);
                this.hiddenTravelFrom = {
                    hiddenMinutes: this.end_date.getMinutes() + Math.floor(this.travelFrom / 60),
                    hiddenTravel: this.travelFrom
                };
                this.travelFrom = maxTravelTimeInSeconds;
                this.end_date.setMinutes(this.end_date.getMinutes() + Math.floor(this.travelFrom / 60));
            }
        }

        if (this.travelTo) {
            if (this.travelTo <= maxTravelTimeInSeconds) {
                this.start_date.setMinutes(this.start_date.getMinutes() - Math.floor(this.travelTo / 60));
            } else {
                //this.start_date.setMinutes(this.start_date.getMinutes() - 60);
                this.hiddenTravelTo = {
                    hiddenMinutes: this.start_date.getMinutes() - Math.floor(this.travelTo / 60),
                    hiddenTravel: this.travelTo
                };
                this.travelTo = maxTravelTimeInSeconds;
                this.start_date.setMinutes(this.start_date.getMinutes() - Math.floor(this.travelTo / 60));
            }
        }
    }
};

ResourceAbsence.prototype.isScheduled = function () {

    return !!this.resource;
};

ResourceAbsence.prototype.getGanttResource = function () {
    return this.resourceId ? this.resourceId.substr(0, 18) : this.resourceId;
};
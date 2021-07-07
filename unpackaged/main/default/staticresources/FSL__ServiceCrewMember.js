"use strict";

function ServiceCrewMember(sobject) {
    this.id = sobject.Id;
    this.name = sobject.Name;
    this.endDate = sobject[fieldNames.ServiceCrewMember.EndDate] || null;
    this.startDate = sobject[fieldNames.ServiceCrewMember.StartDate];
    this.serviceResource = sobject[fieldNames.ServiceCrewMember.ServiceResource];
    this.serviceResource__r = sobject[fieldNames.ServiceCrewMember.ServiceResource__r];
    this.serviceCrew = sobject[fieldNames.ServiceCrewMember.ServiceCrew];
    this.serviceCrew__r = sobject[fieldNames.ServiceCrewMember.ServiceCrew__r];
    this.leader = sobject[fieldNames.ServiceCrewMember.Leader];
    this.ganttLabel = sobject[fieldNames.ServiceCrewMember.GanttLabel];

    this.ganttColor = sobject.ServiceCrew ? sobject.ServiceCrew[fieldNames.ServiceCrew.GanttColor__c] : null;

    this.startDate = __setTimeZoneOffsetToDateField(this.startDate, false, true);
    this.endDate = __setTimeZoneOffsetToDateField(this.endDate, false);
}
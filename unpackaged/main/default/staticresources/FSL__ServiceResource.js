'use strict';

function ServiceResource(sobject) {
    var _this = this;

    this.id = sobject.Id;
    this.online = false;
    this.isUndestaffOrOverStaff = false;
    this.name = sobject.Name;
    this.isCapacityBased = sobject[fieldNames.ServiceResource.IsCapacityBased];
    this.description = sobject[fieldNames.ServiceResource.Description] || '';
    this.isOptimizationCapable = sobject[fieldNames.ServiceResource.IsOptimizationCapable];
    this.relatedRecord = sobject[fieldNames.ServiceResource.RelatedRecord];
    this.relatedRecord__r = sobject[fieldNames.ServiceResource.RelatedRecord__r];
    this.resourceType = sobject[fieldNames.ServiceResource.ResourceType];
    this.ganttLabel = sobject[fieldNames.ServiceResource.GanttLabel__c];
    this.lastKnownLongitude = sobject[fieldNames.ServiceResource.LastKnownLongitude];
    this.lastKnownLocationDate = sobject[fieldNames.ServiceResource.LastKnownLocationDate];
    this.lastKnownLatitude = sobject[fieldNames.ServiceResource.LastKnownLatitude];
    this.serviceCrew = sobject[fieldNames.ServiceResource.ServiceCrew];
    this.serviceCrew__r = sobject[fieldNames.ServiceResource.ServiceCrew__r];

    // no access to the user
    if (this.relatedRecord__r) this.pictureLink = this.relatedRecord__r.SmallPhotoUrl;

    // set online status
    this.onlineOffset = sobject[fieldNames.ServiceResource.Online_Offset__c] || orgOnlineOffset;

    if (this.pictureLink && this.pictureLink.endsWith('profilephoto/005/T')) this.pictureLink = null;

    if (sobject[fieldNames.ServiceResource.PictureLink]) this.pictureLink = sobject[fieldNames.ServiceResource.PictureLink];

    this.skills = {};

    // original sobject, needed for resource filtering
    this.sobject = sobject;

    // set skills
    sobject[fieldNames.ServiceResource.Skills] && sobject[fieldNames.ServiceResource.Skills].forEach(function (skill) {
        _this.skills[skill[fieldNames.ServiceResourceSkill.Skill]] = new ServiceResourceSkill(skill);
    });

    // if (this.lastKnownLocationDate) {
    //     let offset = new Date(resource.lastKnownLocationDate).getTimezoneOffset() * 60 * 1000;
    // }
}
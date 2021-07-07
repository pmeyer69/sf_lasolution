"use strict";

function ServiceResourceSkill(sobject) {
    this.id = sobject.Id;
    this.name = sobject.SkillNumber;
    this.effectiveEndDate = sobject[fieldNames.ServiceResourceSkill.EffectiveEndDate];
    this.effectiveStartDate = sobject[fieldNames.ServiceResourceSkill.EffectiveStartDate];
    this.level = sobject[fieldNames.ServiceResourceSkill.SkillLevel];
    this.serviceResource = sobject[fieldNames.ServiceResourceSkill.ServiceResource];
    this.skill = sobject[fieldNames.ServiceResourceSkill.Skill];

    var tz_start = void 0,
        tz_finish = void 0;

    if (this.effectiveStartDate) tz_start = new Date(this.effectiveStartDate).getTimezoneOffset() * 60 * 1000;

    if (this.effectiveEndDate) tz_finish = new Date(this.effectiveEndDate).getTimezoneOffset() * 60 * 1000;

    this.effectiveStartDate = this.effectiveStartDate ? new Date(this.effectiveStartDate + tz_start) : new Date(0);
    this.effectiveEndDate = this.effectiveEndDate ? new Date(this.effectiveEndDate + tz_finish) : new Date(86400000000000);
}
'use strict';

(function (global) {

    global.Shift = function Shift(sobject) {

        this.id = sobject.Id;
        this.name = sobject[fieldNames.Shift.ShiftNumber];
        this.label = sobject[fieldNames.Shift.Label] || '';
        this.serviceResourceId = sobject[fieldNames.Shift.ServiceResourceId] || null;
        this.serviceTerritoryId = sobject[fieldNames.Shift.ServiceTerritoryId] || null;
        this.status = sobject[fieldNames.Shift.Status];
        this.statusCategory = sobject[fieldNames.Shift.StatusCategory];
        this.timeSlotType = sobject[fieldNames.Shift.TimeSlotType];
        this.startTime = sobject[fieldNames.Shift.StartTime];
        this.endTime = sobject[fieldNames.Shift.EndTime];

        // get all offsets for date fields - add when creating new javascript date
        var tzstartTime = void 0,
            tzendTime = void 0;
        if (this.startTime) tzstartTime = new Date(this.startTime).getTimezoneOffset() * 60 * 1000;

        if (this.endTime) tzendTime = new Date(this.endTime).getTimezoneOffset() * 60 * 1000;

        this.startTime = new Date(this.startTime + tzstartTime);
        this.endTime = new Date(this.endTime + tzendTime);

        // // set this like operating hours time slots - day -> time slots
        // this.slots = {};

        // // overnight shift?
        // if (this.startTime.getDate() != this.endTime.getDate()) {
        //     this.overnight = true;

        //     let newStart = moment(this.startTime), newEnd = moment(this.endTime);
        //     while (!newStart.isAfter(newEnd, 'day')) {

        //         this.slots[newStart.day()] = [new ShiftSlot({startTime: newStart.toDate(), endTime: newEnd.endOf('day').toDate(), timeSlotType: this.timeSlotType})];
        //         newStart = (newStart).add(1, 'day').startOf('day');
        //     }
        // }
        // else {
        //     this.slots[this.startTime.getDay()] = [new ShiftSlot(this)];
        // }
    };

    global.ShiftSlot = function ShiftSlot(shiftObject) {
        this.startTime = shiftObject.startTime;
        this.endTime = shiftObject.endTime;
        this.type = shiftObject.timeSlotType;
    };
})(window);
trigger ARC_manageAppointmentDates on ServiceAppointment (after insert) {

//this code is not optimized; needs refactoring in order to support mass treatments
/*
    for(ServiceAppointment sa :Trigger.New){
        if( sa.ParentRecordType == 'Work Order' && sa.ParentRecordId != NULL){
            WorkOrder wo = [Select Id, StartDate, a_Forcer_heure_slectionnee__c, Duration, DurationType from WorkOrder where id = :sa.ParentRecordId LIMIT 1];
            if(wo.a_Forcer_heure_slectionnee__c){
                sa.ArrivalWindowStartTime = wo.StartDate;
                Integer myMinutes = 0;
                if(wo.DurationType == 'Minutes') {myMinutes = Integer.valueOf(wo.Duration);}
                if(wo.DurationType == 'Hours') {myMinutes = Integer.valueOf(wo.Duration*60);}
                sa.ArrivalWindowEndTime = wo.startDate.addminutes(myMinutes);
            }
            else{
                sa.ArrivalWindowStartTime = DateTime.newInstance(wo.startDate.Year(), wo.startDate.Month(), wo.startDate.Day());
                sa.ArrivalWindowEndTime = sa.ArrivalWindowStartTime.adddays(1);
            }
            
        }



    }
*/

        for(ServiceAppointment sa :Trigger.New){
            //System.assert(TRUE); System.assert(FALSE);
        if( FALSE ){
            //System.assert(TRUE); system.assert(FALSE);
            WorkOrder wo = [Select Id, StartDate, a_Forcer_heure_slectionnee__c, Duration, DurationType from WorkOrder where id = :sa.ParentRecordId LIMIT 1];
            ServiceAppointment saI = [Select Id, ArrivalWindowStartTime, ArrivalWindowEndTime from ServiceAppointment where Id = :sa.Id LIMIT 1];
            if(wo.a_Forcer_heure_slectionnee__c){
                saI.ArrivalWindowStartTime = wo.StartDate;
                Integer myMinutes = 0;
                if(wo.DurationType == 'Minutes') {myMinutes = Integer.valueOf(wo.Duration);}
                if(wo.DurationType == 'Hours') {myMinutes = Integer.valueOf(wo.Duration*60);}
                saI.ArrivalWindowEndTime = wo.startDate.addminutes(myMinutes);
            }
            else{
                saI.ArrivalWindowStartTime = DateTime.newInstance(wo.startDate.Year(), wo.startDate.Month(), wo.startDate.Day());
                saI.ArrivalWindowEndTime = saI.ArrivalWindowStartTime.adddays(1);
            }
            update saI;
            
        }



    }
    
    
    
}
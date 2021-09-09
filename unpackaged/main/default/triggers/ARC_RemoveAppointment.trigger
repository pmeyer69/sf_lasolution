trigger ARC_RemoveAppointment on WorkOrder (after insert) {

Id myRecType = [Select Id from RecordType where DeveloperName = 'Intervention'].Id;

for(WorkOrder wo :Trigger.New){

if(wo.RecordTypeId != myRecType){
List<ServiceAppointment> appList = [Select Id from ServiceAppointment where ParentRecordId = :wo.Id];
Delete appList;
}


}

}
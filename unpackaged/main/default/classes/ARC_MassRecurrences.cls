public class ARC_MassRecurrences {

    @Future
    public static void ApexInterface (String woId){
        ARC_ManageRecurrences.createRecurence(woId);
    }

    @InvocableMethod
    public static void ProcessWO (){
        Id recType = [Select Id from RecordType where DeveloperName = 'Intervention'].Id;
        List<WorkOrder> woList = [Select Id, RecordTypeId, Status from WorkOrder where Status = 'In Progress' and RecordTypeId <> :recType ];
    
    	for(WorkOrder wo :woList){
        	String myWo = wo.Id;
        	ARC_MassRecurrences.ApexInterface(myWO);
        }
    }
    
    
    
    
}
public class ARC_MassPurge {
    
    @InvocableMethod
    public static void resetInterventions(){
        
        Id recType = [Select Id from RecordType where DeveloperName = 'Intervention'].Id;
        List<WorkOrder> woList = [Select Id, RecordTypeId, Status from WorkOrder where /*Status = 'In Progress' and */RecordTypeId <> :recType ];
    	for(WorkOrder wo :woList){
        	wo.a_Derniere_fois_planifie_le__c = NULL;
            wo.a_Prochaine_planification_le__c = NULL;
        }
        update woList;
        List<WorkOrder> woDel = [Select Id, RecordTypeId, Status from WorkOrder where RecordTypeId = :recType ];
        delete woDel;
    }
}
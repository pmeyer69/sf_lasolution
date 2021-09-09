public with sharing class PrestationController {
    
    @AuraEnabled(cacheable=true)
    public static List<WorkOrder> findPrestationByPlanInerventionId(String planInterventionId) {
        List<id> workOrderIds = new List<id>();
        for(Plan_Intervention_Context__c pic : [SELECT Work_Order__c FROM Plan_Intervention_Context__c WHERE  Plan_intervention__c	= :planInterventionId ]){
            workOrderIds.add(pic.Work_Order__c);
        }

        return [SELECT  Id, 
                        WorkOrderNumber,
                        RecordTypeId, 
                        Code_LaMAL__c, 
                        Code_InterRAI__c, 
                        Groupe_InterRAI__c,
                        Status,
                        Priority,
                        Subject,
                        WorkTypeId,
                        Duration,
                        DurationType,
                        a_Type_de_Prestation__c,
                        WorkType.Name
                    FROM WorkOrder 
                    WHERE RecordType.Name = 'Prestation'
                    AND Id in :workOrderIds
                    WITH SECURITY_ENFORCED
                    ORDER BY WorkOrderNumber desc];
    }


    @AuraEnabled(cacheable=true)
    public static List<WorkOrder> findActesByPlanInerventionId(String planInterventionId) {

        List<id> workOrderIds = new List<id>();
        for(Plan_Intervention_Context__c pic : [SELECT Work_Order__c FROM Plan_Intervention_Context__c WHERE  Plan_intervention__c	= :planInterventionId ]){
            workOrderIds.add(pic.Work_Order__c);
        }

        return [SELECT  Id, 
                        WorkOrderNumber,
                        RecordTypeId, 
                        Code_LaMAL__c, 
                        Code_InterRAI__c, 
                        Groupe_InterRAI__c,
                        Status,
                        Priority,
                        Subject,
                        a_Prestation__c,
                        Acte__c,
                        Remarque_de_l_inf_r_f__c,
                        Temps__c,
                        Fr_quence_InterRAI__c,
                        Nb_InterRAI__c,
                        a_Prestation__r.WorkOrderNumber
                    FROM WorkOrder 
                    WHERE RecordType.Name = 'Acte'
                    AND a_Prestation__c in :workOrderIds
                    WITH SECURITY_ENFORCED
                    ORDER BY WorkOrderNumber desc];
    }



    @AuraEnabled(cacheable=true)
    public static List<WorkOrder> findActesByPrestationId(String prestationId) {

        return [SELECT  Id, 
                        WorkOrderNumber,
                        RecordTypeId, 
                        Code_LaMAL__c, 
                        Code_InterRAI__c, 
                        Groupe_InterRAI__c,
                        Status,
                        Priority,
                        Subject,
                        a_Prestation__c,
                        Temps__c,
                        Remarque_de_l_inf_r_f__c,
                        Acte__c,
                        a_Prestation__r.WorkOrderNumber
                    FROM WorkOrder 
                    WHERE RecordType.Name = 'Acte'
                    AND a_Prestation__c =: prestationId
                    WITH SECURITY_ENFORCED
                    ORDER BY WorkOrderNumber desc];
    }
    

    @AuraEnabled(cacheable=true)
    public static List<WorkOrder> retrieveInterRaiCatalogue() {

        return [SELECT  Id, 
                        WorkOrderNumber,
                        Code_LaMAL__c, 
                        Code_InterRAI__c, 
                        Groupe_InterRAI__c,
                        Status,
                        Priority,
                        Subject,
                        Code_de_facturation__c,
                        Temps__c,
                        Nb_InterRAI__c,
                        Fr_quence_InterRAI__c,
                        Temps_InterRAI__c,
                        WorkTypeId,
                        a_Prestation__r.WorkOrderNumber
                    FROM WorkOrder 
                    WHERE RecordType.Name = 'Catalogue des prestations'
                    WITH SECURITY_ENFORCED
                    ORDER BY Code_InterRAI__c asc];
    }


}
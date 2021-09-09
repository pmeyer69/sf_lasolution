public with sharing class MyControllerExtension {
    private ApexPages.StandardSetController setController;


    Plan_intervention__c planIntervention;
    

    public MyControllerExtension(ApexPages.StandardController stdController) {
        this.planIntervention =  (Plan_intervention__c) stdController.getRecord();
    }


    public List<WorkOrder> getActes(){
        return PrestationController.findActesByPlanInerventionId(this.planIntervention.Id);
    }


}
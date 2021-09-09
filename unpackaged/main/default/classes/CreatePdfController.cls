public with sharing class CreatePdfController {


    @AuraEnabled 
    public static String getPdfFileOpas(String planInterventionId) {
        PageReference pdfPage = Page.envelope;
        
        //List<WorkOrder> prestations = PrestationController.findPrestationByPlanInerventionId(planIntervantionId);


        Plan_intervention__c planIntervention = new Plan_intervention__c(id = 'a169E000001ecabQAA');
        
        pdfPage.getParameters().put('id', planIntervention.id);
        Blob pdfBlob = pdfPage.getContent();
        String base64Pdf = EncodingUtil.base64Encode(pdfBlob);
        return base64Pdf;
    }

}
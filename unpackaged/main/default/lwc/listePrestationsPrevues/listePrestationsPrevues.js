import { getFieldValue, getRecord } from 'lightning/uiRecordApi';
import { api, LightningElement, wire } from 'lwc';

import { loadScript } from 'lightning/platformResourceLoader';
import findActesByPlanInerventionId from '@salesforce/apex/PrestationController.findActesByPlanInerventionId';

import downloadPDF from '@salesforce/apex/CreatePdfController.getPdfFileAsBase64String';
import downloadjs from '@salesforce/resourceUrl/downloadjs';


import PLAN_INTER_FIELD from '@salesforce/schema/liste_des_prestations_pr_vues__c.Plan_intervention__c';



const fields = [PLAN_INTER_FIELD];


export default class ListePrestationsPrevues extends LightningElement {


    columns =  [
        { label: 'Acte', fieldName: 'Acte__c'},
        { label: 'Code InterRai', fieldName: 'Code_InterRAI__c'},
        { label: 'Prestation', fieldName: 'WorkOrderNum'},
        { label: 'Temps', fieldName: 'Temps__c'},
        { label: 'Remarque de l’inf. réf.', fieldName: 'Remarque_de_l_inf_r_f__c'},
    ];
    
    @api
    recordId;

    lpp;

    wiredResult;

    planInterventionId;

    @wire(getRecord, {recordId: '$recordId', fields: fields})
    wiredRecord(result) {
        this.wiredResult = result;
        if (result.data) {
            this.lpp = result.data;
            this.planInterventionId = getFieldValue(this.lpp, PLAN_INTER_FIELD);
            this.error = undefined;

        } else if (result.error) {
            this.error = result.error;
            this.actes = undefined;
        }
    }  


    @wire(findActesByPlanInerventionId, {planInterventionId:'$planInterventionId'})
    actes;







    boolShowSpinner = false;
    pdfString;
    generatePdf(){
        this.boolShowSpinner = true;
        downloadPDF({}).then(response => {
            console.log(response);
            this.boolShowSpinner = false;
            let strFile = "data:application/pdf;base64,"+response;
            window.download(strFile, "sample.pdf", "application/pdf");

        }).catch(error => {
            console.log('Error: ' +error.body.message);
        });
    }
    renderedCallback() {
        loadScript(this, downloadjs)
        .then(() => console.log('Loaded download.js'))
        .catch(error => console.log(error));
    } 


}
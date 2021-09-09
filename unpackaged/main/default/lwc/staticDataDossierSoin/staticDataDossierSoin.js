import { api, LightningElement, wire } from 'lwc';

import { getFieldValue, getRecord } from 'lightning/uiRecordApi';


import PATIENT_FIELD from '@salesforce/schema/Dossier_de_soins__c.Patient__c';


const fields = [PATIENT_FIELD];


export default class StaticDataDossierSoin extends LightningElement {


    @api
    recordId;

    
    @wire(getRecord, {recordId: '$recordId', fields: fields})
    dossierSoin;

    
    get patientId(){
        return getFieldValue(this.dossierSoin.data, PATIENT_FIELD);
    } 


}
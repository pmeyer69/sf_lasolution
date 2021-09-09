import { api, LightningElement, wire } from 'lwc';

import findTransmissionsByDossierSoinId from '@salesforce/apex/DossierSoinController.findTransmissionsByDossierSoinId';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import { NavigationMixin } from 'lightning/navigation';

import { refreshApex } from '@salesforce/apex';
import { deleteRecord } from 'lightning/uiRecordApi';

import hasPermission from '@salesforce/customPermission/DeleteUpdateTransmission';

export default class TransmissionRecordList extends NavigationMixin(LightningElement)  {


    get isButtonDisable() {
        return !hasPermission;
    }

    


    @api
    recordId;

    @wire(findTransmissionsByDossierSoinId,{dossierSoinId:'$recordId'}) 
    transmissions;

    selectedRecordId = null;


    


    deleteTransmission(event) {
        const recordId = event.target.dataset.targetId;
        
        deleteRecord(recordId)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Transmission deleted',
                        variant: 'success'
                    })
                );
                return refreshApex(this.transmissions);
            })
            .catch((error) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error deleting record',
                        message: error,
                        variant: 'error'
                    })
                );
            });
    }


    editTransmission(event){
        this.selectedRecordId = event.target.dataset.targetId;
        this.template.querySelector('c-transmission-record-modal').openEditModal();
    }

    addTransmission(event){
        this.template.querySelector('c-transmission-record-modal').openCreateModal();
    }

    navigateToDossierSoin(){
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Dossier_de_soins__c',
                actionName: 'view'
            }
        });
    }
    
    handleCreateSuccess(){
        return refreshApex(this.transmissions);
    }

}
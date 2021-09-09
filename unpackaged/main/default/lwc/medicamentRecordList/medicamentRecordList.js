import { api, LightningElement, track, wire } from 'lwc';

import findMedicamentsByDossierSoinId from '@salesforce/apex/DossierSoinController.findMedicamentsByDossierSoinId';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import { NavigationMixin } from 'lightning/navigation';

import { refreshApex } from '@salesforce/apex';
import { deleteRecord } from 'lightning/uiRecordApi';


import PRISE_HEBDOMADAIRE_FIELD from '@salesforce/schema/m_dicament__c.Prise_hebdomadaire__c';
import PRISE_JOURNALIERE_FIELD from '@salesforce/schema/m_dicament__c.prise_journaliere__c';
import MEDICAMENT_FIELD from '@salesforce/schema/m_dicament__c.M_dicament__c';
import JOURS_FIELD from '@salesforce/schema/m_dicament__c.Jours__c';

export default class MedicamentRecordList extends NavigationMixin(LightningElement)  {

    fields = [PRISE_HEBDOMADAIRE_FIELD, PRISE_JOURNALIERE_FIELD, MEDICAMENT_FIELD, JOURS_FIELD];

    @track
    perOsMedicaments;

    @track
    parenteralMedicaments;

    @track
    autreMedicaments;
    
    @track
    historiqueMedicaments;

    @track
    medicaments;

    @api
    recordId

    wiredResult;

    selectedRecordId = null;
    

    @wire(findMedicamentsByDossierSoinId,{dossierSoinId:'$recordId'})
    wiredMedicament(result) {  
        this.wiredResult = result;
        if (result.data) {

            this.medicaments = result.data;

            var perOs = [];
            var parenterals = [];
            var autres = [];
            var historiques = [];


            result.data.forEach(medicament => {


                const now = Date.now();
                const datefin = new Date(medicament.Date_de_fin__c);
                if(now > datefin.getTime()){
                    historiques.push(medicament);
                }else{
                    switch (medicament.Cat_gories__c) {
                        case 'Per os':
                            perOs.push(medicament);
                            break;
                        case 'Parentéral':
                            parenterals.push(medicament);
                            break;
                        case 'Autre':
                            autres.push(medicament);
                            break;
                        default:
                    }
                }
            });
            this.perOsMedicaments = perOs;
            this.parenteralMedicaments = parenterals;
            this.autreMedicaments = autres;
            this.historiqueMedicaments = historiques;

            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.record = undefined;
        }
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


    deleteMedicament(event) {

        const recordId = event.detail;
        deleteRecord(recordId)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Médicament deleted',
                        variant: 'success'
                    })
                );
                return refreshApex(this.wiredResult);
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

    setDateFin(event){
        this.selectedRecordId = event.detail;
        this.template.querySelector('c-medicament-record-modal').openEditSetDateFinModal();
    }

    editMedicament(event){
        this.selectedRecordId = event.detail;
        this.template.querySelector('c-medicament-record-modal').openEditModal();
    }

    addPerOs(){
        this.template.querySelector('c-medicament-record-modal').openCreateModal('Per os');
    }

    addParenteral(){
        this.template.querySelector('c-medicament-record-modal').openCreateModal('Parentéral');
    }

    addAutre(){
        this.template.querySelector('c-medicament-record-modal').openCreateModal('Autre');
    }

    handleEditSuccess(){
        return refreshApex(this.wiredResult);
    }


    handleCreateSuccess(){
        return refreshApex(this.wiredResult);
    }
}
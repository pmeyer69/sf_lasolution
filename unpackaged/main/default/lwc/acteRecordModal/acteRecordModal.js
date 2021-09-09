import { api, LightningElement, track, wire } from 'lwc';

import retrieveInterRaiCatalogue from '@salesforce/apex/PrestationController.retrieveInterRaiCatalogue';


import { publish, MessageContext } from 'lightning/messageService';
import ACTES_EVENT_CHANNEL from '@salesforce/messageChannel/Actes__c';



export default class ActeRecordModal extends LightningElement {

    isModalEditOpen = false;
    isModalCreateOpen = false;
    isModalReadOnlyOpen = false;

    @api
    recordId;


    @wire(MessageContext)
    messageContext;

    @api
    prestationId;

    @api
    patientId

    @api
    dossierPriseChargeId;



    searchedCatalogues;

    catalogue;

    error;

    selectedCatalogueItem;
    
    @track
    showActesListFlag = false;

    @wire(retrieveInterRaiCatalogue)
    wiredCatalogue({ error, data }) {
        if (data) {
           this.catalogue = data;

           let tempRecords = JSON.parse( JSON.stringify( data ) );
           tempRecords = tempRecords.map( row => {
               return { ...row, menuDisplay: row.Code_InterRAI__c + ' - ' + row.Subject};
           })
           this.catalogue = tempRecords;
           this.error = undefined;

        } else if (error) {
            console.error('ERROR => ', error);
        }
    }

 
    @api
    openEditModal(){
        this.isModalEditOpen = true;
    }

    @api
    openCreateModal(){
        this.isModalCreateOpen = true;
        this.showActesListFlag = false;
        this.initSelectedCatalogueItem();
    }

    @api
    openReadOnlyModal(){
        this.isModalReadOnlyOpen = true;
    }

    initSelectedCatalogueItem(){
        this.selectedCatalogueItem = {Subject:'',
                                        Code_InterRAI__c:'', 
                                        Code_LaMAL__c:'', 
                                        Code_de_facturation__c:'',
                                        Temps__c:'',
                                        Groupe_InterRAI__c:'',
                                        Nb_InterRAI__c: '',
                                        Fr_quence_InterRAI__c:'',
                                        Temps_InterRAI__c:'',
                                        menuDisplay:'',
                                        selectedCatalogueItem:''};
    }

    closeEditModal(){
        this.isModalEditOpen = false;
    }

    closeCreateModal(){
        this.isModalCreateOpen = false;
    }

    closeReadOnlyModal(){
        this.isModalReadOnlyOpen = false;
    }

    handleMenuSelect(event){
        let selectedItem = this.catalogue.find(element =>  element.Id === event.target.dataset.id);
        this.selectedCatalogueItem = selectedItem;
        this.showActesListFlag = false;
    }


    handleKeyChange(event) {

        if (!this.showActesListFlag) {
            this.showActesListFlag = true;
        }

        const searchKey = event.target.value;
        if(searchKey === ''){
            this.searchedCatalogues = null;
            this.showActesListFlag = false;
        }else{
            let searchedCataloguesTemp = this.catalogue.filter(item => item.menuDisplay.toLowerCase().includes(searchKey.toLowerCase()));
            if(!(Array.isArray(searchedCataloguesTemp) && searchedCataloguesTemp.length)){
                this.showActesListFlag = false;
            }
            this.searchedCatalogues = searchedCataloguesTemp;
        }
                
    }


    handleCreateSuccess(){
        publish(this.messageContext, ACTES_EVENT_CHANNEL);
        this.isModalCreateOpen = false;
    }

    handleEditSuccess(){
        publish(this.messageContext, ACTES_EVENT_CHANNEL);
        this.isModalEditOpen = false;
    }

}
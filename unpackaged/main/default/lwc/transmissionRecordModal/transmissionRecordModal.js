import { api, LightningElement, wire } from 'lwc';

export default class TransmissionRecordModal extends LightningElement {

    isModalEditOpen = false;
    isModalCreateOpen = false;

    @api
    dossierDeSoinId;

    @api
    recordId;


    @api
    openEditModal(){
        this.isModalEditOpen = true;
    }

    @api
    openCreateModal(){
        this.isModalCreateOpen = true;
    }

    handleEditSuccess(event) {
        this.isModalEditOpen = false;
    }

    closeEditModal(){
        this.isModalEditOpen = false;
    }


    handleCreateSuccess(){
        this.isModalCreateOpen = false;
        const event = new CustomEvent('createtransmission');
        this.dispatchEvent(event);
    }

    closeCreateModal(){
        this.isModalCreateOpen = false;
    }

}
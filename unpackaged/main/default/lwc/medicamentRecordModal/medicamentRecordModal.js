import { api, LightningElement } from 'lwc';

export default class MedicamentRecordModal extends LightningElement {

    isModalEditOpen = false;
    isModalCreateOpen = false;
    isSetDateFinOpen = false;
    categorieMedicament = null;


    @api
    dossierDeSoinId;

    @api
    recordId;

    @api
    openEditModal(){
        this.isModalEditOpen = true;
    }

    @api
    openEditSetDateFinModal(){
        this.isSetDateFinOpen =true;
    }

    @api
    openCreateModal(categorieMedicament){
        this.categorieMedicament = categorieMedicament;
        this.isModalCreateOpen = true;
    }

    handleEditSuccess() {
        this.isModalEditOpen = false;
        const event = new CustomEvent('editmedicament');
        this.dispatchEvent(event);
    }

    closeSetDateFinModal(){
        this.isSetDateFinOpen = false;
    }

    closeEditModal(){
        this.isModalEditOpen = false;
    }

    handleCreateSuccess(){
        this.isModalCreateOpen = false;
        const event = new CustomEvent('createmedicament');
        this.dispatchEvent(event);
    }

    closeCreateModal(){
        this.isModalCreateOpen = false;
    }

}
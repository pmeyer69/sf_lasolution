public with sharing class MyControllerExtension {
    private ApexPages.StandardSetController setController;

    public MyControllerExtension(List<WorkOrder> records) {
        this.setController = setController;
        setController =  new ApexPages.StandardSetController(records);
    }
}
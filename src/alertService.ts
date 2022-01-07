import { ButtonType, DismissBlockingDialog, SNAlertService } from '@standardnotes/snjs';

export default class WebAlertService implements SNAlertService {
  confirm(text: string, title?: string, confirmButtonText?: string, confirmButtonType?: ButtonType, cancelButtonText?: string): Promise<boolean> {
    console.log(text);
    return
    //throw new Error('Method not implemented.');
  }

  alert(text: string, title?: string, closeButtonText?: string): Promise<void> {
    console.log(text);
    return
    //throw new Error('Method not implemented.');
  }

  blockingDialog(): DismissBlockingDialog | Promise<DismissBlockingDialog> {
    throw new Error('Method not implemented.');
  }
}

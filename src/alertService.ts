import { ButtonType, DismissBlockingDialog, SNAlertService } from '@standardnotes/snjs';

export default class WebAlertService implements SNAlertService {
  confirm(text: string, title?: string, confirmButtonText?: string, confirmButtonType?: ButtonType, cancelButtonText?: string): Promise<boolean> {
    console.log(text);
    return
  }

  alert(text: string, title?: string, closeButtonText?: string): Promise<void> {
    console.log(text);
    return;
  }

  blockingDialog(): DismissBlockingDialog | Promise<DismissBlockingDialog> {
    throw new Error('Method not implemented.');
  }
}

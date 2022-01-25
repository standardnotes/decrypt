import { ButtonType, DismissBlockingDialog, SNAlertService } from '@standardnotes/snjs';

export default class WebAlertService implements SNAlertService {
  confirm(text: string, _title?: string, _confirmButtonText?: string, _confirmButtonType?: ButtonType, _cancelButtonText?: string): Promise<boolean> {
    console.log(text);

    // @ts-ignore
    return;
  }

  alert(text: string, _title?: string, _closeButtonText?: string): Promise<void> {
    console.log(text);

    // @ts-ignore
    return;
  }

  blockingDialog(): DismissBlockingDialog | Promise<DismissBlockingDialog> {
    throw new Error('Method not implemented.');
  }
}

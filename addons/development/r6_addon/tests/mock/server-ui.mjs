// Minimal @minecraft/server-ui mock for headless smoke tests.
export const __ui = { opened: [] };

class BaseForm {
    constructor() {
        this.titleText = "";
        this.bodyText = "";
        this.buttons = [];
    }
    title(text) { this.titleText = text; return this; }
    body(text) { this.bodyText = text; return this; }
    button(text) { this.buttons.push(text); return this; }
    show(player) {
        __ui.opened.push({ type: this.constructor.name, player: player?.name, title: this.titleText });
        if (this.autoResult !== undefined) {
            return Promise.resolve(this.autoResult);
        }
        return Promise.resolve({ canceled: true, selection: undefined });
    }
}

export class ActionFormData extends BaseForm { }

export class ModalFormData extends BaseForm {
    slider() { return this; }
    toggle() { return this; }
    textField() { return this; }
    dropdown() { return this; }
}

export class MessageFormData extends BaseForm {
    button1(text) { this.buttons.push(text); return this; }
    button2(text) { this.buttons.push(text); return this; }
}

export class FormResponse {
    constructor(selection, canceled = false) {
        this.selection = selection;
        this.canceled = canceled;
    }
}

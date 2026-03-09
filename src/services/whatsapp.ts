// Serviço para integração com WhatsApp API
export interface WhatsAppMessage {
  to: string;
  message: string;
  type?: 'text' | 'template';
}

export interface WhatsAppConfig {
  apiUrl: string;
  token: string;
  phoneNumberId: string;
}

class WhatsAppService {
  private config: WhatsAppConfig | null = null;

  // Configurar credenciais da API do WhatsApp
  configure(config: WhatsAppConfig) {
    this.config = config;
  }

  // Enviar mensagem via WhatsApp Business API
  async sendMessage(message: WhatsAppMessage): Promise<boolean> {
    if (!this.config) {
      console.warn('WhatsApp não configurado. Abrindo WhatsApp Web...');
      this.fallbackToWhatsAppWeb(message);
      return false;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: message.to,
          type: 'text',
          text: {
            body: message.message
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Mensagem WhatsApp enviada:', result);
        return true;
      } else {
        console.error('Erro ao enviar mensagem WhatsApp:', response.statusText);
        this.fallbackToWhatsAppWeb(message);
        return false;
      }
    } catch (error) {
      console.error('Erro na integração WhatsApp:', error);
      this.fallbackToWhatsAppWeb(message);
      return false;
    }
  }

  // Fallback para WhatsApp Web se API falhar
  private fallbackToWhatsAppWeb(message: WhatsAppMessage) {
    const encodedMessage = encodeURIComponent(message.message);
    const whatsappUrl = `https://wa.me/${message.to}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  // Enviar via Twilio (alternativa)
  async sendViaTwilio(message: WhatsAppMessage, twilioConfig: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  }): Promise<boolean> {
    try {
      const response = await fetch('/api/whatsapp/twilio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: `whatsapp:+${message.to}`,
          from: `whatsapp:${twilioConfig.fromNumber}`,
          body: message.message,
          accountSid: twilioConfig.accountSid,
          authToken: twilioConfig.authToken,
        })
      });

      if (response.ok) {
        console.log('Mensagem Twilio enviada com sucesso');
        return true;
      } else {
        console.error('Erro Twilio:', response.statusText);
        this.fallbackToWhatsAppWeb(message);
        return false;
      }
    } catch (error) {
      console.error('Erro Twilio:', error);
      this.fallbackToWhatsAppWeb(message);
      return false;
    }
  }

  // Enviar via serviço local (se tiver backend próprio)
  async sendViaLocalAPI(message: WhatsAppMessage): Promise<boolean> {
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        console.log('Mensagem enviada via API local');
        return true;
      } else {
        console.error('Erro API local:', response.statusText);
        this.fallbackToWhatsAppWeb(message);
        return false;
      }
    } catch (error) {
      console.error('Erro API local:', error);
      this.fallbackToWhatsAppWeb(message);
      return false;
    }
  }
}

export const whatsappService = new WhatsAppService();

// Configurações para diferentes provedores
export const configureWhatsApp = () => {
  // Opção 1: WhatsApp Business API (Meta)
  const metaConfig: WhatsAppConfig = {
    apiUrl: process.env.REACT_APP_WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0',
    token: process.env.REACT_APP_WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.REACT_APP_WHATSAPP_PHONE_ID || ''
  };

  // Só configura se tiver as credenciais
  if (metaConfig.token && metaConfig.phoneNumberId) {
    whatsappService.configure(metaConfig);
    console.log('WhatsApp configurado com Meta Business API');
  } else {
    console.log('WhatsApp não configurado - usando fallback para WhatsApp Web');
  }
};

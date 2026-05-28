import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentInfoService {
  constructor(private readonly configService: ConfigService) {}

  getPaymentInfo(method: PaymentMethod) {
    switch (method) {
      case PaymentMethod.TRANSFER:
        return {
          method,
          instructions: 'Transfer ke salah satu rekening berikut:',
          accounts: [
            {
              bank: 'BCA',
              accountNumber: this.configService.get('BANK_BCA_NUMBER'),
              accountName: this.configService.get('BANK_BCA_NAME'),
            },
            {
              bank: 'Bank Jago',
              accountNumber: this.configService.get('BANK_JAGO_NUMBER'),
              accountName: this.configService.get('BANK_JAGO_NAME'),
            },
          ],
          note: 'Setelah transfer, upload bukti pembayaran.',
        };

      case PaymentMethod.QRIS:
        return {
          method,
          instructions: 'Scan QR code berikut menggunakan aplikasi apapun yang mendukung QRIS:',
          qrisImageUrl: this.configService.get('QRIS_IMAGE_URL'),
          qrisName: this.configService.get('QRIS_NAME') ?? 'RentGo',
          qrisNmid: this.configService.get('QRIS_NMID'),
          note: 'Setelah pembayaran berhasil, upload screenshot bukti pembayaran.',
        };

      case PaymentMethod.EWALLET:
        return {
          method,
          instructions: 'Transfer ke salah satu e-wallet berikut:',
          accounts: [
            {
              platform: 'GoPay',
              number: '089617463727',
              accountName: 'Rent-Go',
            },
            {
              platform: 'OVO',
              number: '089617463727',
              accountName: 'Rent-Go',
            },
            {
              platform: 'Dana',
              number: '089617463727',
              accountName: 'Rent-Go',
            },
          ],
          note: 'Setelah transfer, upload screenshot bukti pembayaran.',
        };

      default:
        return { method, instructions: 'Method pembayaran tidak tersedia.' };
    }
  }
}
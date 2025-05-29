import { Address, beginCell, toNano } from '@ton/core';

export interface Recipient {
    address: string;
    amount: string; // в nanocoins
}

export class MassTransferService {
    // 📤 Подготовка множественных переводов токенов
    async prepareMassTransfer(
        userJettonWalletAddress: string,
        recipients: Recipient[],
        userAddress: string
    ) {
        try {
            console.log('📤 Preparing mass transfer...');
            console.log('- From wallet:', userJettonWalletAddress);
            console.log('- Recipients:', recipients.length);
            console.log('- User:', userAddress);

            const transactions = [];

            // Создаем отдельную транзакцию для каждого получателя
            for (let i = 0; i < recipients.length; i++) {
                const recipient = recipients[i];
                
                console.log(`📝 Transfer ${i + 1}/${recipients.length}:`, {
                    to: recipient.address,
                    amount: (Number(recipient.amount) / 1e9).toFixed(2) + ' tokens'
                });

                // Создаем payload для перевода jetton токенов
                const transferPayload = beginCell()
                    .storeUint(0x0f8a7ea5, 32) // transfer op
                    .storeUint(Date.now(), 64) // query_id (уникальный)
                    .storeCoins(BigInt(recipient.amount)) // количество токенов
                    .storeAddress(Address.parse(recipient.address)) // получатель
                    .storeAddress(Address.parse(userAddress)) // response_destination  
                    .storeUint(0, 1) // custom_payload (null)
                    .storeCoins(toNano('0.01')) // forward_ton_amount
                    .storeUint(0, 1) // forward_payload (null)
                    .endCell();

                // Добавляем транзакцию в список
                transactions.push({
                    address: userJettonWalletAddress,
                    amount: toNano('0.05').toString(), // Gas для каждого перевода
                    payload: transferPayload.toBoc().toString('base64')
                });
            }

            const totalGas = Number(toNano('0.05')) * recipients.length;
            console.log('💰 Total gas needed:', (totalGas / 1e9).toFixed(3), 'TON');

            return {
                transactions,
                totalRecipients: recipients.length,
                totalGas
            };

        } catch (error) {
            console.error('❌ Error preparing mass transfer:', error);
            throw error;
        }
    }

    // 🔄 Пакетная отправка (разбивка на группы для экономии газа)
    async prepareBatchTransfer(
        userJettonWalletAddress: string,
        recipients: Recipient[],
        userAddress: string,
        batchSize: number = 4 // Максимум 4 перевода за транзакцию
    ) {
        try {
            console.log('📦 Preparing batch transfer...');
            console.log('- Recipients:', recipients.length);
            console.log('- Batch size:', batchSize);

            const batches = [];
            
            // Разбиваем получателей на группы
            for (let i = 0; i < recipients.length; i += batchSize) {
                const batch = recipients.slice(i, i + batchSize);
                
                // Создаем одну транзакцию с несколькими сообщениями
                const messages = batch.map(recipient => {
                    const transferPayload = beginCell()
                        .storeUint(0x0f8a7ea5, 32) // transfer op
                        .storeUint(Date.now() + i, 64) // уникальный query_id
                        .storeCoins(BigInt(recipient.amount))
                        .storeAddress(Address.parse(recipient.address))
                        .storeAddress(Address.parse(userAddress))
                        .storeUint(0, 1) // custom_payload
                        .storeCoins(toNano('0.01')) // forward_ton_amount
                        .storeUint(0, 1) // forward_payload
                        .endCell();

                    return {
                        address: userJettonWalletAddress,
                        amount: toNano('0.05').toString(),
                        payload: transferPayload.toBoc().toString('base64')
                    };
                });

                batches.push({
                    batchNumber: Math.floor(i / batchSize) + 1,
                    recipients: batch.length,
                    messages
                });
            }

            console.log('📦 Created', batches.length, 'batches');

            return {
                batches,
                totalBatches: batches.length,
                totalRecipients: recipients.length
            };

        } catch (error) {
            console.error('❌ Error preparing batch transfer:', error);
            throw error;
        }
    }

    // 🔍 Валидация получателей
    validateRecipients(recipients: Recipient[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!recipients || recipients.length === 0) {
            errors.push('Recipients list is empty');
            return { valid: false, errors };
        }

        recipients.forEach((recipient, index) => {
            // Проверяем адрес
            try {
                Address.parse(recipient.address);
            } catch {
                errors.push(`Invalid address at index ${index}: ${recipient.address}`);
            }

            // Проверяем сумму
            const amount = Number(recipient.amount);
            if (isNaN(amount) || amount <= 0) {
                errors.push(`Invalid amount at index ${index}: ${recipient.amount}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export const massTransferService = new MassTransferService();
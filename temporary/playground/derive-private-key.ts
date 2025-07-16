import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { stringToPath } from "@cosmjs/crypto";
import { Bip39, EnglishMnemonic, Slip10, Slip10Curve } from "@cosmjs/crypto";

async function derivePrivateKey() {
    const mnemonic = "media kidney swap slot fade acoustic sad fire shop city almost wrong vanish trim episode until island net pluck firm laugh burden inform wagon";
    
    try {
        // Validate mnemonic
        const mnemonicChecked = new EnglishMnemonic(mnemonic);
        const seed = await Bip39.mnemonicToSeed(mnemonicChecked);
        
        // Derive the private key using the THORChain HD path
        const hdPath = stringToPath("m/44'/931'/0'/0/0");
        const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, hdPath);
        
        // Convert to base64
        const base64PrivateKey = Buffer.from(privkey).toString('base64');
        
        // Create wallet to get the address
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
            prefix: "thor",
            hdPaths: [hdPath]
        });
        
        const accounts = await wallet.getAccounts();
        const account = accounts[0];
        
        console.log("   THORChain Address:", account.address);
        console.log(`   THORCHAIN_PRIVATE_KEY=${base64PrivateKey}`);
        
    } catch (error) {
        console.error("❌ Error deriving private key:", error);
        console.log("");
        console.log("💡 Make sure your mnemonic phrase is correct and contains 12 or 24 words");
    }
}

// Run the function
derivePrivateKey().catch(console.error);

const fs = require('fs');
const path = require('path');

const filesToDecode = [
  'c:/weorder/mobile/src/components/settlement/SettlementSummary.tsx',
  'c:/weorder/mobile/src/components/settlement/PaymentSettings.tsx',
  'c:/weorder/mobile/src/components/settlement/PayLinkButton.tsx',
  'c:/weorder/mobile/src/components/room/RoomStatusBadge.tsx',
  'c:/weorder/mobile/src/components/room/RoomCard.tsx',
  'c:/weorder/mobile/src/components/order/AddItemModal.tsx',
  'c:/weorder/mobile/src/components/layout/BottomNav.tsx'
];

function decodeFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }
    const content = fs.readFileSync(absolutePath, 'utf8');
    
    // Replace all literal \uXXXX sequences with their actual characters
    // Using a regex to match both literal \\uXXXX and \uXXXX inside the string
    const decoded = content.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
      return String.fromCharCode(parseInt(grp, 16));
    });
    
    fs.writeFileSync(absolutePath, decoded, 'utf8');
    console.log(`Successfully decoded: ${filePath}`);
  } catch (error) {
    console.error(`Error decoding ${filePath}:`, error);
  }
}

filesToDecode.forEach(decodeFile);

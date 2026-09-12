const UNITS = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readTriple(triple: number, showZeroHundred: boolean): string {
  const hundred = Math.floor(triple / 100);
  const ten = Math.floor((triple % 100) / 10);
  const unit = triple % 10;

  if (hundred === 0 && ten === 0 && unit === 0) return '';

  let result = '';

  if (hundred > 0 || showZeroHundred) {
    result += `${UNITS[hundred]} trăm `;
  }

  if (ten === 0 && unit > 0) {
    result += 'lẻ ';
  } else if (ten === 1) {
    result += 'mười ';
  } else if (ten > 1) {
    result += `${UNITS[ten]} mươi `;
  }

  if (unit === 1) {
    if (ten > 1) {
      result += 'mốt';
    } else {
      result += UNITS[unit];
    }
  } else if (unit === 5) {
    if (ten > 0) {
      result += 'lăm';
    } else {
      result += UNITS[unit];
    }
  } else if (unit > 0) {
    result += UNITS[unit];
  }

  return result.trim();
}

export function numberToVietnameseWords(amount: number): string {
  if (amount === 0) return 'Không đồng';
  if (isNaN(amount)) return '';

  const cleanAmount = Math.abs(Math.round(amount));
  const str = cleanAmount.toString();
  
  // Split into 3-digit groups
  const groups: number[] = [];
  for (let i = str.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    groups.unshift(parseInt(str.substring(start, i), 10));
  }

  const groupNames = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let words = '';

  for (let i = 0; i < groups.length; i++) {
    const groupVal = groups[i];
    const groupPos = groups.length - 1 - i;

    if (groupVal > 0) {
      const showZeroHundred = i > 0;
      const groupText = readTriple(groupVal, showZeroHundred);
      words += `${groupText} ${groupNames[groupPos]} `;
    }
  }

  words = words.trim();
  if (!words) return 'Không đồng';

  // Capitalize first character
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  return `${capitalized} đồng chẵn`;
}

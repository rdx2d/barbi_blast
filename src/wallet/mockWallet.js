export const MOCK_STATE = Object.freeze({
  DISCONNECTED: 'disconnected',
  HOLDER: 'holder',
  NON_HOLDER: 'non_holder',
});

const HOLDER_BALANCE = 750;
const NON_HOLDER_BALANCE = 25;

let currentState = MOCK_STATE.DISCONNECTED;
let currentBalance = 0;
let currentAddress = null;

export function getMock() {
  return {
    state: currentState,
    balance: currentBalance,
    address: currentAddress,
  };
}

export function connectMockAsNonHolder() {
  currentState = MOCK_STATE.NON_HOLDER;
  currentBalance = NON_HOLDER_BALANCE;
  currentAddress = 'MockNonHolder1111111111111111111111111111111';
  return getMock();
}

export function toggleMockHolder() {
  if (currentState === MOCK_STATE.DISCONNECTED) {
    return connectMockAsNonHolder();
  }
  if (currentState === MOCK_STATE.HOLDER) {
    currentState = MOCK_STATE.NON_HOLDER;
    currentBalance = NON_HOLDER_BALANCE;
    currentAddress = 'MockNonHolder1111111111111111111111111111111';
  } else {
    currentState = MOCK_STATE.HOLDER;
    currentBalance = HOLDER_BALANCE;
    currentAddress = 'MockHolder2222222222222222222222222222222222';
  }
  return getMock();
}

export function disconnectMock() {
  currentState = MOCK_STATE.DISCONNECTED;
  currentBalance = 0;
  currentAddress = null;
  return getMock();
}

"use strict";
const labelWelcome = document.querySelector(".welcome");
const labelDate = document.querySelector(".date");
const labelBalance = document.querySelector(".balance__value");
const labelSumIn = document.querySelector(".summary__value--in");
const labelSumOut = document.querySelector(".summary__value--out");
const labelSumInterest = document.querySelector(".summary__value--interest");
const labelTimer = document.querySelector(".timer");

const containerApp = document.querySelector(".app");
const containerMovements = document.querySelector(".movements");

const btnLogin = document.querySelector(".login__btn");
const btnTransfer = document.querySelector(".form__btn--transfer");
const btnLoan = document.querySelector(".form__btn--loan");
const btnClose = document.querySelector(".form__btn--close");
const btnSort = document.querySelector(".btn--sort");

const inputLoginUsername = document.querySelector(".login__input--user");
const inputLoginPin = document.querySelector(".login__input--pin");
const inputTransferTo = document.querySelector(".form__input--to");
const inputTransferAmount = document.querySelector(".form__input--amount");
const inputLoanAmount = document.querySelector(".form__input--loan-amount");
const inputCloseUsername = document.querySelector(".form__input--user");
const inputClosePin = document.querySelector(".form__input--pin");

class Account {
  constructor(owner, movements, interestRate, pin, movementsDates, currency, locale) {
    this.owner = owner;
    this.movements = movements;
    this.interestRate = interestRate;
    this.pin = pin;
    this.movementsDates = movementsDates;
    this.currency = currency;
    this.locale = locale;
  }

  calculateBalance() {
    this.balance = this.movements.reduce((acc, mov) => acc + mov, 0);
    return this.balance;
  }

  addMovement(amount) {
    this.movements.push(amount);
    this.movementsDates.push(new Date().toISOString());
  }

  formatDate(date) {
    const calcDaysPassed = (date1, date2) =>
      Math.round(Math.abs(date2 - date1) / (1000 * 60 * 60 * 24));

    const daysPassed = calcDaysPassed(new Date(), new Date(date));

    if (daysPassed === 0) return "Today";
    if (daysPassed === 1) return "Yesterday";
    if (daysPassed <= 7) return `${daysPassed} days ago`;

    return new Intl.DateTimeFormat(this.locale).format(new Date(date));
  }

  formatCurrency(value) {
    return new Intl.NumberFormat(this.locale, {
      style: "currency",
      currency: this.currency,
    }).format(value);
  }
}

class Bank {
  constructor(accounts) {
    this.accounts = accounts;
    this.currentAccount = null;
    this.timer = null;
    this.sorted = false;

    // Initialize event listeners
    this.initEventListeners();
  }

  static createUserNames(accounts) {
    accounts.forEach((acc) => {
      acc.username = acc.owner
        .toLowerCase()
        .split(" ")
        .map((name) => name[0])
        .join("");
    });
  }

  login(username, pin) {
    const account = this.accounts.find((acc) => acc.username === username);

    if (account?.pin === pin) {
      this.currentAccount = account;
      return account;
    }
    return null;
  }

  logout() {
    this.currentAccount = null;
    if (this.timer) clearInterval(this.timer);
  }

  toggleSort() {
    if (!this.currentAccount) return;
    this.sorted = !this.sorted;
    this.displayMovements(this.sorted);
  }

  startLogoutTimer() {
    const tick = () => {
      const min = String(Math.trunc(time / 60)).padStart(2, 0);
      const sec = String(time % 60).padStart(2, 0);
      labelTimer.textContent = `${min}:${sec}`;

      if (time === 0) {
        clearInterval(this.timer);
        this.logout();
        labelWelcome.textContent = "Log in to get started";
        containerApp.style.opacity = 0;
      }
      time--;
    };

    let time = 600;
    tick();
    this.timer = setInterval(tick, 1000);
    return this.timer;
  }

  transfer(receiverUsername, amount) {
    const receiverAcc = this.accounts.find((acc) => acc.username === receiverUsername);

    if (
      amount > 0 &&
      receiverAcc &&
      this.currentAccount.balance >= amount &&
      receiverAcc?.username !== this.currentAccount.username
    ) {
      this.currentAccount.addMovement(-amount);
      receiverAcc.addMovement(amount);
      return true;
    }
    return false;
  }

  requestLoan(amount) {
    if (this.currentAccount.movements.some((mov) => mov >= amount * 0.1)) {
      this.currentAccount.addMovement(amount);
      return true;
    }
    return false;
  }

  closeAccount(username, pin) {
    if (this.currentAccount.username === username && this.currentAccount.pin === pin) {
      const index = this.accounts.findIndex((acc) => acc.username === this.currentAccount.username);
      this.accounts.splice(index, 1);
      this.logout();
      return true;
    }
    return false;
  }

  displayMovements(sort = false) {
    containerMovements.innerHTML = "";
    const movs = sort
      ? this.currentAccount.movements.slice().sort((a, b) => a - b)
      : this.currentAccount.movements;

    movs.forEach((mov, i) => {
      const type = mov > 0 ? "deposit" : "withdrawal";
      const date = this.currentAccount.formatDate(this.currentAccount.movementsDates[i]);
      const formattedMov = this.currentAccount.formatCurrency(mov);

      const html = `
        <div class="movements__row">
          <div class="movements__type movements__type--${type}">${i + 1} ${type}</div>
          <div class="movements__date">${date}</div>
          <div class="movements__value">${formattedMov}</div>
        </div>
      `;
      containerMovements.insertAdjacentHTML("afterbegin", html);
    });
  }

  updateUI() {
    this.currentAccount.calculateBalance();
    labelBalance.textContent = this.currentAccount.formatCurrency(this.currentAccount.balance);

    this.displayMovements(this.sorted);

    const incomes = this.currentAccount.movements
      .filter((mov) => mov > 0)
      .reduce((acc, mov) => acc + mov, 0);
    const out = this.currentAccount.movements
      .filter((mov) => mov < 0)
      .reduce((acc, mov) => acc + mov, 0);
    const interest = this.currentAccount.movements
      .filter((mov) => mov > 0)
      .map((deposit) => (deposit * this.currentAccount.interestRate) / 100)
      .filter((int) => int >= 1)
      .reduce((acc, int) => acc + int, 0);

    labelSumIn.textContent = this.currentAccount.formatCurrency(incomes);
    labelSumOut.textContent = this.currentAccount.formatCurrency(Math.abs(out));
    labelSumInterest.textContent = this.currentAccount.formatCurrency(interest);
  }

  initEventListeners() {
    btnLogin.addEventListener("click", (e) => {
      e.preventDefault();

      const username = inputLoginUsername.value;
      const pin = Number(inputLoginPin.value);

      const account = this.login(username, pin);
      if (account) {
        labelWelcome.textContent = `Welcome back, ${account.owner.split(" ")[0]}`;
        containerApp.style.opacity = 100;

        const now = new Date();
        const options = {
          hour: "numeric",
          minute: "numeric",
          day: "numeric",
          month: "numeric",
          year: "numeric",
        };
        labelDate.textContent = new Intl.DateTimeFormat(account.locale, options).format(now);

        inputLoginUsername.value = inputLoginPin.value = "";
        inputLoginPin.blur();

        if (this.timer) clearInterval(this.timer);
        this.timer = this.startLogoutTimer();

        this.updateUI();
      } else {
        labelWelcome.textContent = "Incorrect username or PIN. Please try again.";
        containerApp.style.opacity = 0;
      }
    });

    btnTransfer.addEventListener("click", (e) => {
      e.preventDefault();
      const amount = Number(inputTransferAmount.value);
      const receiverUsername = inputTransferTo.value;

      if (this.transfer(receiverUsername, amount)) {
        inputTransferAmount.value = inputTransferTo.value = "";
        this.sorted = false;
        this.updateUI();

        clearInterval(this.timer);
        this.timer = this.startLogoutTimer();
      } else {
        alert("Transfer failed. Check details or account balance.");
      }
    });

    btnLoan.addEventListener("click", (e) => {
      e.preventDefault();
      const amount = Math.floor(inputLoanAmount.value);

      if (this.requestLoan(amount)) {
        inputLoanAmount.value = "";
        this.sorted = false;
        this.updateUI();

        clearInterval(this.timer);
        this.timer = this.startLogoutTimer();
      } else {
        alert("Loan request denied. Ensure you meet the criteria.");
      }
    });

    btnClose.addEventListener("click", (e) => {
      e.preventDefault();

      const username = inputCloseUsername.value;
      const pin = Number(inputClosePin.value);

      if (this.closeAccount(username, pin)) {
        containerApp.style.opacity = 0;
        inputCloseUsername.value = inputClosePin.value = "";
      } else {
        alert("Failed to close account. Check username and PIN.");
      }
    });

    btnSort.addEventListener("click", (e) => {
      e.preventDefault();
      this.toggleSort();
      clearInterval(this.timer);
      this.timer = this.startLogoutTimer();
    });
  }
}

// Instantiate Accounts
const account1 = new Account(
  "Jonas Schmedtmann",
  [200, 455.23, -306.5, 25000, -642.21, -133.9, 79.97, 1300],
  1.2,
  1111,
  [
    "2019-11-18T21:31:17.178Z",
    "2019-12-23T07:42:02.383Z",
    "2020-01-28T09:15:04.904Z",
    "2020-04-01T10:17:24.185Z",
    "2020-05-08T14:11:59.604Z",
    "2020-05-27T17:01:17.194Z",
    "2020-07-11T23:36:17.929Z",
    "2020-07-12T10:51:36.790Z",
  ],
  "EUR",
  "pt-PT"
);

const account2 = new Account(
  "Jessica Davis",
  [5000, 3400, -150, -790, -3210, -1000, 8500, -30],
  1.5,
  2222,
  [
    "2019-11-01T13:15:33.035Z",
    "2019-11-30T09:48:16.867Z",
    "2019-12-25T06:04:23.907Z",
    "2020-01-25T14:18:46.235Z",
    "2020-02-05T16:33:06.386Z",
    "2020-04-10T14:43:26.374Z",
    "2020-06-25T18:49:59.371Z",
    "2020-07-26T12:01:20.894Z",
  ],
  "USD",
  "en-US"
);

// Initialize Bank
const accounts = [account1, account2];
Bank.createUserNames(accounts);
const bank = new Bank(accounts);
console.log(accounts);

/////////////////////////////////////////////////

// let arr = ['a', 'b', 'c', 'd', 'e'];
// console.log(arr.slice(2));
// console.log(arr.slice(2, 4));

// //NOTE SPLICE usuwa oryginalna arrray

// const arr2 = ['j', 'i', 'h', 'g', 'f'];
// console.log(arr2.reverse);

// // NOTE CONCAT
// const letters = arr.concat(arr2);
// console.log(letters);

// // NOTE JOIN

// console.log(letters.join(' - '));

// const arr = [23, 11, 64];
// console.log(arr);
// console.log(arr.at(0));

// const movements = [200, 450, -400, 3000, -650, -130, 70, 1300];

// for (const movement of movements) {
//   if (movement > 0) console.log(`You deposited ${movement}`);
//   else console.log(`You withdrew ${Math.abs(movement)}`);
// }

// //NOTE ELEMENT INDEX ARRAY
// movements.forEach(function (mov, i, arr) {
//   if (mov > 0) console.log(`Movement ${i + 1} You deposited ${mov}`);
//   else console.log(`Movement ${i + 1} You withdrew ${Math.abs(mov)}`);
// });

// const currencies2 = new Map([
//   ['USD', 'United States dollar'],
//   ['EUR', 'Euro'],
//   ['GBP', 'Pound sterling'],
// ]);

// currencies2.forEach(function (value, key, map) {
//   console.log(`${key}: ${value}`);
// });

// const currenciesUnique = new Set(['USD', 'GBP', 'USD', 'EUR', 'EUR']);
// console.log(currenciesUnique);
// currenciesUnique.forEach(function (value, _, map) {
//   console.log(`${key}: ${value}`);
// });

//SECTION MAP METHOD
//NOTE METODA .MAP WYPISUJE KOPUJE ARRAYA I POTEM WYPISUJE WARTOŚCI NOWO PRZYDIZELONE
//NOTE FOR EACH WYPISUJE RZECZY Z ARRAYA JAKO TEKST
// const movements = [200, 450, -400, 3000, -650, -130, 70, 1300];
// const euroToUsd = 1.1;

// const movementsUSD = movements.map((mov) => mov * euroToUsd);

// const movementsUSDfor = [];
// for (const mov of movements) movementsUSDfor.push(mov * euroToUsd);

// const movementDescription = movements.forEach((mov, i) => {
//   if (mov > 0) {
//     return `Movement ${i + 1}: You deposited ${mov}`;
//   } else {
//     return `Movement ${i + 1}: You withdrew ${Math.abs(mov)}`;
//   }
// });
// console.log(movementDescription);

//SECTION FILTER

// const deposits = movements.filter(function (mov) {
//   return mov > 0;
// });
// const withdrawal = movements.filter(function (mov) {
//   return mov < 0;
// });
// console.log(deposits);
// console.log(withdrawal);

// //SECTION REDUCE
// //NOTE REDUCE PIERWSZE TO ACCUMULATOR CZYLI TAKA SUMA 0 TO PODSTAWOWA WARTOSC TAM NA DOLE PISZESZ
// const balance = movements.reduce(function (acc, cur, i, arr) {
//   return acc + cur;
// }, 0);
// console.log(balance);

//MAX VALUE
// const max = movements.reduce((acc, mov) => {
//   if (acc > mov) {
//     return acc;
//   } else {
//     return mov;
//   }
// }, movements[0]);
// console.log(max);

//SECTION MAGIC OF CHAINING METHODS
// const eurToUsd = 1.1;
// const totalDepositsUSD = Math.trunc(
//   movements
//     .filter((mov) => mov > 0)
//     .map((mov) => mov * eurToUsd)
//     .reduce((acc, mov) => acc + mov)
// );
// console.log(totalDepositsUSD);

//SECTION FIND
//NOTE FIND TYLKO PIERWSZA WYPISUJE [LITERĘ] KTORA JEST TRUE A FILTER ARRAYA I WSZYTSKO

// const firstWithdrawal = movements.find((mov) => mov < 0);

// const account = accounts.find((acc) => (acc.owner = "Jessica Davis"));
// console.log(account);

//SECTION SOME AND EVERY
//NOTE RETURNS TRUE IF SOME METHODS ARE TRUE
// const anyDeposits = movements.some((mov) => mov > 5000);
// const everyDeposits = movements.every((mov) => mov > -1000);
// console.log(anyDeposits, everyDeposits);

//SECTION FLAT
//NOTE FLAT REMOVES NESTED ARRAYS I DAJE DO JEDNEGO ARRAYA
//NOTE FLAT(ILE RAZY POWTORZYC)
// const arr = [[1, 2, 3], [4, 5, 6], 7, 8];
// console.log(arr.flat());

// const arrDeep = [[[1, 2, 3]], [[4, 5, 6]], [7, 8]];
// console.log(arrDeep.flat(3));

// const accountMovments = accounts.map((acc) => acc.movements);
// console.log(accountMovments);
// const allMovments = accountMovments.flat().reduce((acc, es) => acc + es, 0);
// console.log(allMovments);

//SECTION SORTINGS
// const owners = ["Jonas", "Zach", "Adam", "Martha"];
// console.log(owners.sort());

// //NOTE .SORT SORTUJE STRINGI DEFAULTOWO

// movements.sort((a, b) => a - b);
// console.log(movements);

//SECTION MORE WAYS OF CREATING AND FILLING ARRAYS
// const z = Array.from({ length: 100 }, (_, i) => Math.trunc(Math.random() * 100 + 1));
// console.log(z);

// const movementsUI = Array.from(document.querySelectorAll(".movements__value"));

//ARRAY METHODS PRACTICE

// const bankDepositSum = accounts
//   .map((acc) => acc.movements)
//   .flat()
//   .filter((mov) => mov > 0)
//   .reduce((sum, cur) => sum + cur, 0);

// //2.
// // const numDeposits1000 = accounts.flatMap((acc) => acc.movements).filter((mov) => mov > 1000).length;
// const numDeposits1000 = accounts
//   .flatMap((acc) => acc.movements)
//   .reduce((sum, cur) => (cur >= 1000 ? sum + 1 : sum), 0);

// console.log(numDeposits1000);
// console.log(bankDepositSum);

//SECTION CONVERTING AND CHECKING NUMBERS

// console.log(Number.parseFloat("     2.5rem     "));
// console.log(Number.parseInt("23weewew"));

// //NOTE BETTER THAN isNaN
// console.log(Number.isFinite(20));
// console.log(Number.isFinite("20"));

// //SECTION MATH AND ROUNDING

// console.log(Math.sqrt(25));
// console.log(25 ** (1 / 2));
// console.log(8 ** (1 / 3));
// console.log(Math.max(5, 18, 23, 11, 2));
// console.log(Math.max(5, 18, "23", 11, 2));

// console.log(Math.min(5, 18, "23", 11, 2));
// console.log(Math.min(5, 18, "23", 11, 2));

// console.log(Math.PI * Number.parseFloat("10px") ** 2);

// console.log(Math.trunc(Math.random() * 6 + 1));

// const randomInt = (min, max) => Math.trunc(Math.random * (max - min + 1)) + min;

// console.log(randomInt(10, 20));

// //Rounding integers

// console.log(Math.round(23.9));
// console.log(Math.trunc(23.9));
// console.log(Math.ceil(23.9));
// console.log(Math.floor(-23.9));
// console.log(Math.trunc(-23.9));

// console.log((2.7).toFixed(2));
// console.log((2.7).toFixed(3));
// console.log((2.7323).toFixed(3));

//SECTION remainder operator
// console.log(5 % 2);
// console.log(5 / 2);

// labelBalance.addEventListener("click", function () {
//   [...document.querySelectorAll(".movements__row")].forEach(function (row, i) {
//     if (i % 2 === 0) row.style.backgroundColor = "orangered";
//     if (i % 2 === 1) row.style.backgroundColor = "blue";
//   });
// });

// //SECTION NUMERIC SEPERATOR

// const diamater = 287_460_000_000;
// const priceCents = 345_99;
// const transferFee = 15_00;

// //SECTION BIGINT
// console.log(34234234238742384823n);

// console.log(34234234238742384823n + 3129831283n);

// const huge = 382932983982938n;
// const num = 23;
// console.log(huge * BigInt(num));
// console.log(20n > 15);
// console.log(20n === 15);

//SECTION CREATING DATES
// const now = new Date();
// console.log(now);

// console.log(new Date("Aug 02 2020 18:45:01"));

// console.log(new Date(0));
// console.log(new Date(3 * 24 * 60 * 60 * 1000));

// const future = new Date(2037, 10, 19, 15, 23);
// console.log(future);
// console.log(future.getFullYear());
// console.log(future.getMonth());
// console.log(future.getDate());
// console.log(future.getDay());
// console.log(future.getHours());
// console.log(future.toISOString());
// console.log(future.getTime());

// console.log(Date.now());

//SECTIONS OPERATIONS WITH DATES

// const future = new Date(2037, 10, 19, 15, 23);

// const calcDaysPassed = (date1, date2) => Math.abs(date2 - date1) / (1000 * 60 * 60 * 24);

// const days1 = calcDaysPassed(new Date(2073, 3, 4), new Date(2073, 3, 14));
// console.log(days1);

//SECTION SETTIMEOUT

// const ingredients = ["olives", "spinach"];
// const pizzaTimer = setTimeout(
//   (ing1, ing2) => {
//     console.log(`Here is your pizza with ${ing1} and ${ing2}`);
//   },
//   3000,
//   ...ingredients
// );
// console.log(`waiting...`);

// if (ingredients.includes("spinach")) clearTimeout(pizzaTimer);

// setInterval(() => {
//   const now = new Date();
//   console.log(now);
// }, 1000);

// setInterval(() => {
//   const now = new Date();
//   const hours = now.getHours();
//   const minutes = now.getMinutes();
//   const seconds = now.getSeconds();
//   console.log(hours, minutes, seconds);
// }, 1000);

// // //CHALLANGE ARRAYS

// const dogsJulia = [3, 5, 2, 12, 7];
// const dogsKate = [9, 16, 6, 8, 3];
// const dogsJuliaCorrect = dogsJulia.slice(1, 3);
// const concatted = dogsKate.concat(dogsJuliaCorrect);
// function checkDogs(dogsJuliaidogsKate) {
//   dogsJuliaidogsKate.forEach((element, i) => {
//     if (element >= 3) console.log(`Dog number ${i + 1} is a adult and is ${element} years old`);
//     if (element < 3) console.log(`Dog number ${i + 1} is a puppy and is ${element} years old`);
//   });
// }

// checkDogs(concatted);

//CHALLANGE 2 MAP FILTER REDUCE

// function calcAverageHumanAge(ages) {
//   const allAges = ages.map((element) => {
//     if (element <= 2) {
//       return 2 * element;
//     } else if (element > 2) {
//       return 16 + element * 4;
//     }
//   });
//   const Underage = allAges.filter(function (age) {
//     return age >= 18;
//   });

//   const average = Underage.reduce((acc, mov) => acc + mov, 0) / Underage.length;

//   console.log(average);
// }

// calcAverageHumanAge([5, 2, 4, 1, 15, 8, 3]);

//CHALLANGE 3 MAP FILTER REDUCE

// function calcAverageHumanAge(ages) {
//   const allAges = ages
//     .map((element) => {
//       if (element <= 2) {
//         return 2 * element;
//       } else if (element > 2) {
//         return 16 + element * 4;
//       }
//     })
//     .filter((age) => age >= 18)
//     .reduce((acc, mov, i, arr) => acc + mov / arr.length, 0);

//   console.log(allAges);
// }

// calcAverageHumanAge([5, 2, 4, 1, 15, 8, 3]);

//=CHALLANGE 4
///////////////////////////////////////
// Coding Challenge #4

/* 
Julia and Kate are still studying dogs, and this time they are studying if dogs are eating too much or too little.
Eating too much means the dog's current food portion is larger than the recommended portion, and eating too little is the opposite.
Eating an okay amount means the dog's current food portion is within a range 10% above and 10% below the recommended portion (see hint).

1. Loop over the array containing dog objects, and for each dog, calculate the recommended food portion and add it to the object as a new property. Do NOT create a new array, simply loop over the array. Forumla: recommendedFood = weight ** 0.75 * 28. (The result is in grams of food, and the weight needs to be in kg)
2. Find Sarah's dog and log to the console whether it's eating too much or too little. HINT: Some dogs have multiple owners, so you first need to find Sarah in the owners array, and so this one is a bit tricky (on purpose) 🤓
3. Create an array containing all owners of dogs who eat too much ('ownersEatTooMuch') and an array with all owners of dogs who eat too little ('ownersEatTooLittle').
4. Log a string to the console for each array created in 3., like this: "Matilda and Alice and Bob's dogs eat too much!" and "Sarah and John and Michael's dogs eat too little!"
5. Log to the console whether there is any dog eating EXACTLY the amount of food that is recommended (just true or false)
6. Log to the console whether there is any dog eating an OKAY amount of food (just true or false)
7. Create an array containing the dogs that are eating an OKAY amount of food (try to reuse the condition used in 6.) 
8. Create a shallow copy of the dogs array and sort it by recommended food portion in an ascending order (keep in mind that the portions are inside the array's objects)

HINT 1: Use many different tools to solve these challenges, you can use sthe summary lecture to choose between them 😉
HINT 2: Being within a range 10% above and below the recommended portion means: current > (recommended * 0.90) && current < (recommended * 1.10). Basically, the current portion should be between 90% and 110% of the recommended portion.

TEST DATA:

GOOD LUCK 😀
*/
// const dogs = [
//   { weight: 22, curFood: 250, owners: ["Alice", "Bob"] },
//   { weight: 8, curFood: 200, owners: ["Matilda"] },
//   { weight: 13, curFood: 275, owners: ["Sarah", "John"] },
//   { weight: 32, curFood: 340, owners: ["Michael"] },
// ];
// //1
// dogs.forEach((dog) => (dog.recommendedFood = Math.trunc(dog.weight ** 0.75 * 28)));
// console.log(dogs);
// //2
// const dogSarah = dogs.find((dog) => dog.owners.includes("Sarah"));
// console.log(dogSarah);
// console.log(
//   `Sarah's dog is eating too ${dogSarah.curFood > dogSarah.recFood ? "much" : "little"} `
// );
// //3,4
// const ownersEatTooMuch = dogs
//   .filter((el) => el.curFood > el.recommendedFood)
//   .flatMap((el, i, arr) => el.owners);

// console.log(`${ownersEatTooMuch.join(" and ")} dogs eat too much!`);

// const ownersEatTooLittle = dogs
//   .filter((el) => el.curFood < el.recommendedFood)
//   .flatMap((el, i, arr) => el.owners);

// console.log(`${ownersEatTooLittle.join(" and ")} dogs eat too little!`);

// //5
// console.log(dogs.some((el) => el.curFood === el.recommendedFood));

// //6
// const okay = (dog) =>
//   dog.curFood > dog.recommendedFood * 0.9 && dog.curFood < dog.recommendedFood * 1.1;

// console.log(dogs.some(okay));

// // //7
// // Create an array containing the dogs that are eating an OKAY amount of food (try to reuse the condition used in 6.)

// console.log(dogs.filter(okay));

// const num = 3884764.23;

// const options = {
//   style: "unit",
//   unit: "mile-per-hour",
// };

// console.log("US", new Intl.NumberFormat("en-US").format(num));
// console.log("GE", new Intl.NumberFormat("de-DE").format(num));
// console.log("PL", new Intl.NumberFormat("pl-PL").format(num));

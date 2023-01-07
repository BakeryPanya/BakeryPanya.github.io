let btn1 = document.getElementById('btn1');
let btn2= document.getElementById('btn2');
let btn3 = document.getElementById('btn3');
let btn4 = document.getElementById('btn4');
let btn5 = document.getElementById('btn5');
let btn6 = document.getElementById('btn6');
let btn7 = document.getElementById('btn7');
let btn8 = document.getElementById('btn8');
let btn9 = document.getElementById('btn9');
let btn10 = document.getElementById('btn10');

let count = 0;

btn1.onclick = function(){
  let text_one = document.getElementById('text_one');
  let one_detail = document.getElementById('one_detail');
  one_detail.innerHTML = text_one.value;
}

btn2.onclick = function(){
  let text_one = document.getElementById('text_two');
  let one_detail = document.getElementById('two_detail');
  two_detail.innerHTML = text_two.value;
}

btn3.onclick = function(){
  let text_three = document.getElementById('text_three');
  let three_detail = document.getElementById('three_detail');
  three_detail.innerHTML = text_three.value;
}

btn4.onclick = function(){
  let text_four = document.getElementById('text_four');
  let four_detail = document.getElementById('four_detail');
  four_detail.innerHTML = text_four.value;
}

btn5.onclick = function(){
  let text_five = document.getElementById('text_five');
  let five_detail = document.getElementById('five_detail');
  five_detail.innerHTML = text_five.value;
}

btn6.onclick = function(){
  let text_six = document.getElementById('text_six');
  let six_detail = document.getElementById('six_detail');
  six_detail.innerHTML = text_six.value;
}

btn7.onclick = function(){
  let doko = document.getElementById('doko');
  let where = document.getElementById('where');
  where.innerHTML = doko.value;
}

btn8.onclick = function(){
  let di = document.getElementById('di');
  let trip = document.getElementById('trip');
  trip.innerHTML = di.value;
}

btn9.onclick = function(){
  let dan = document.getElementById('dan');
  let num = document.getElementById('num');
  num.innerHTML = dan.value;
}

btn10.onclick = function(){
  let src = document.getElementById('koro');
  let dice = Math.floor(Math.random()*(7-1)+1);
  let kazu = document.getElementById('kazu');
  let kazu_detail = document.getElementById('kazu_detail');
  let one = document.getElementById('text_one');
  let two = document.getElementById('text_two');
  let three = document.getElementById('text_three');
  let four = document.getElementById('text_four');
  let five = document.getElementById('text_five');
  let six = document.getElementById('text_six');

  count +=1;
  switch (dice) {
    case 1:
      src.src="dice_img/1-1.png";
      kazu_detail.innerHTML =  count + "回目、出た目的地は"+ one.value + "だ!";
      break;
    case 2:
      src.src="dice_img/2-2.png";
      kazu_detail.innerHTML =  count +"回目、出た目的地は"+ two.value + "だ!";
      break;
    case 3:
      src.src="dice_img/3-3.png";
      kazu_detail.innerHTML =  count +"回目、出た目的地は"+ three.value + "だ!";
      break;
    case 4:
      src.src="dice_img/4-4.png";
      kazu_detail.innerHTML =  count +"回目、出た目的地は"+ four.value + "だ!";
      break;
    case 5:
      src.src="dice_img/5-5.png";
      kazu_detail.innerHTML =  count +"回目、出た目的地は"+ five.value + "だ!";
      break;
    case 6:
      src.src="dice_img/6-6.png";
      kazu_detail.innerHTML =  count +"回目、出た目的地は"+ six.value + "だ!";
      break;
    default:
      break;

  }
}

let btn;
let width = 100;
let height = 100;


function click(){
    width += 10;
    height += 10;
    document.getElementById("btn").style.width = width + "px";
    document.getElementById("btn").style.height = height + "px";
    alert("wow");

}
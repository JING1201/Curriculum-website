function countDown()
{
	document.getElementById("countDownButton").innerHTML = document.getElementById("countDownButton").innerHTML - (-1);
}
function countUp()
{
	document.getElementById("countDownButton").innerHTML = document.getElementById("countDownButton").innerHTML - (1);
}
function mouseOn()
{
	//console.log(event.currentTarget.getAttributeNS(null, "transform").slice(7,-1).split(' '));
	var searchEles = document.getElementById('ee').getElementsByTagName("svg")[0].children; //inside svg
	for(var i = 0; i < searchEles.length; i++) 
	{
		if(searchEles[i].tagName == 'line') 
		{
			$(searchEles[i]).stop().animate({opacity: 0.2}, 1000);
			$(searchEles[i]).stop().animate({opacity: 0.2}, 1000);
		}
	    if(searchEles[i].tagName == 'g') 
	    {
	        if(searchEles[i].classList.contains("nodes")) 
	        {
	        	var targetG = searchEles[i];
	        	var childText = targetG.getElementsByTagName("text")[0];
				var childCircle = targetG.getElementsByTagName("circle")[0];
	        	if(childCircle.classList.contains("highlight"))
	        	{

	        	}
	        	if(targetG != event.currentTarget)
	        	{
					$(childCircle).stop().animate({opacity: 0.2}, 1000);
					$(childText).stop().animate({opacity: 0.2}, 1000);
				}
				else
				{
					childCircle.classList.add("highlight");
					childCircle.classList.add("prereq");
				}
	        }
	    }
	}

	/*for (var i = 0; i < allGs.length; i++)  //https://stackoverflow.com/questions/24803812/how-to-get-inner-tags-in-g-tags-in-svg
	{
		if(document.getElementsByClassName("nodes")[i]) // if this is a node
		{
			if(document.getElementsByClassName("nodes")[i].childNodes[1].id != s)
			{
				var targetG = document.getElementsByClassName("nodes")[i];
				var childText = targetG.childNodes[3];
				var childCircle = targetG.childNodes[1];
				childCircle.classList.add("highlight");
				childCircle.classList.add("prereq");
				$(childCircle).stop().animate({opacity: 0.2}, 1000);
				$(childText).stop().animate({opacity: 0.2}, 1000);
				console.log("Hello World " + targetG.childNodes[3]);
			}
			else
			{
				var targetG = document.getElementsByClassName("nodes")[i];
				var childText = targetG.childNodes[3];
				var childCircle = targetG.childNodes[1];
				childCircle.classList.add("highlight");
				childCircle.classList.add("prereq");
				$(childCircle).stop().animate({opacity: 1}, 1000, 'easeOutQuart');
				$(childText).stop().animate({opacity: 1}, 1000, 'easeOutQuart');
				console.log("Hello World " + targetG.childNodes[3]);
			}
		}
	}*/

}
function mouseOff()
{
	var allGs = document.getElementsByTagName('g');

	var searchEles = document.getElementById('ee').getElementsByTagName("svg")[0].children; //inside svg
	for(var i = 0; i < searchEles.length; i++) 
	{
		if(searchEles[i].tagName == 'line') 
		{
			$(searchEles[i]).stop().animate({opacity: 1}, 1000);
			$(searchEles[i]).stop().animate({opacity: 1}, 1000);
		}
	    if(searchEles[i].tagName == 'g') 
	    {
	        if(searchEles[i].classList.contains("nodes")) 
	        {
	        	var targetG = searchEles[i];
	        	var childText = targetG.getElementsByTagName("text")[0];
				var childCircle = targetG.getElementsByTagName("circle")[0];
				childCircle.classList.remove("highlight");
				childCircle.classList.remove("prereq");
				$(childCircle).stop().animate({opacity: 1}, 1000);
				$(childText).stop().animate({opacity: 1}, 1000);
	        }
	    }
	}
}

function drawGCircle() 
{
	var name = "shrek";
	var xcord = 300;
	var ycord = 350;

	var svgns = "http://www.w3.org/2000/svg";
	var gnode = document.createElementNS(svgns, 'g');
	gnode.setAttribute("class", "nodes draggable");
	gnode.setAttribute("transform", "matrix(1 0 0 1 0 0)");  	//drag
	gnode.setAttribute("onmousedown", "selectElement(evt)"); 	//drag
	gnode.setAttribute("onmouseover", "mouseOn()");
	gnode.setAttribute("onmouseleave", "mouseOff()");

	var gCircle = document.createElementNS(svgns, 'circle');
	gCircle.setAttribute("class", "course");
	gCircle.setAttribute("r", "30");
	gCircle.setAttribute("opacity", "1");
	gCircle.setAttribute("stroke", "black");
	gCircle.setAttribute("stroke-width", 0);
	gCircle.setAttribute("id", name);
	gCircle.setAttribute("cx", xcord);
	gCircle.setAttribute("cy", ycord);
	gCircle.setAttribute("style", "fill: rgb(229, 115, 115);");

	var gText = document.createElementNS(svgns, 'text');
	gText.setAttribute("class", "courseNames");
	gText.setAttribute("id", name);
	gText.setAttribute("text-anchor", "middle");
	gText.setAttribute("transform", "translate(" + xcord + ", " + ycord + ")");
	gText.setAttribute("opacity", "1");
	var node = document.createTextNode(name);
	gText.appendChild(node);

	var empty;

	gnode.appendChild(gCircle);
	gnode.appendChild(gCircle);
	gnode.appendChild(gText);
	gnode.appendChild(gText);
	var element = document.getElementById("ee").getElementsByTagName("svg")[0];
	element.appendChild(gnode);
}



function moveElement(evt)	//dragging source  //http://www.petercollingridge.co.uk/interactive-svg-components/draggable-svg-element
{
  dx = evt.clientX - currentX;
  dy = evt.clientY - currentY;
  currentMatrix[4] -= (-dx);
  currentMatrix[5] -= (-dy);
  newMatrix = "matrix(1 0 0 1 " + currentMatrix[4] + " " + currentMatrix[5] + ")";
            
  selectedElement.setAttributeNS(null, "transform", newMatrix);
  currentX = evt.clientX;
  currentY = evt.clientY;
}

function deselectElement(evt) 
{
	//console.log("DeselectElement ");
    if (selectedElement != 0) 
    {
        selectedElement.removeAttributeNS(null, "onmousemove");
        selectedElement.removeAttributeNS(null, "onmouseout");
        selectedElement.removeAttributeNS(null, "onmouseup");
        selectedElement = 0;
    }
}

function mouseDown(evt)	//test evt
{
	console.log(evt.target.parentElement);
	console.log(evt.clientX);

}
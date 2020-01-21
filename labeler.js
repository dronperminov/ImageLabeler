const diff = 5

var startPoint = null
var endPoint = null
var currBox = null
var entities = []
var entities_boxes = []

var moveIndex = -1
var movePoint = null

var resizeIndex = -1
var resizeType = null
var resizePoint = null
var borders = [ "left", "top", "right", "bottom"]

var isBlocked = false

var labels = [ "text", "table", "picture" ]
var colors = [ "255, 0, 0", "0, 255, 0", "0, 0, 255" ]
var img = $('.labeler-image')

function get_box(startPoint, endPoint, label = "") {
	x = Math.min(startPoint.x, endPoint.x)
	y = Math.min(startPoint.y, endPoint.y)

	width = Math.abs(startPoint.x - endPoint.x)
	height = Math.abs(startPoint.y - endPoint.y)

	return { 
		label: label,
		x: x,
		y: y,
		width: width,
		height: height
	}
}

function get_box_index(x, y) {
	for (let i = 0; i < entities.length; i++) {
		let box = entities[i]

		if (x > box.x + diff && y > box.y + diff && x < box.x + box.width - diff && y < box.y + box.height - diff)
			return i
	}

	return -1
}

function check_line(x, y, x1, y1, x2, y2) {
	if (x1 == x2) {
		return x > x1 - diff && x < x1 + diff && y >= y1 && y <= y2
	}
	else if (y1 == y2) {
		return y > y1 - diff && y < y1 + diff && x >= x1 && x <= x2
	}

	return false
}

function get_box_resize_index(x, y) {
	for (let i = 0; i < entities.length; i++) {
		let box = entities[i]

		if (check_line(x, y, box.x, box.y, box.x, box.y + box.height))
			return { index: i, type: 1 }
			
		if (check_line(x, y, box.x, box.y, box.x + box.width, box.y))
			return { index: i, type: 2 }

		if (check_line(x, y, box.x + box.width, box.y, box.x + box.width, box.y + box.height))
			return { index: i, type: 3 }
			
		if (check_line(x, y, box.x, box.y + box.height, box.x + box.width, box.y + box.height))
			return { index: i, type: 4 }
	}

	return null
}

function show_entities() {
	$("#entities-data").text(JSON.stringify({ name: "name", entites: entities }, null, "  "));
}

function get_color(label, opacity = false) {
	return "rgba(" + colors[labels.indexOf(label)] + (opacity ? ", 0.15" : "") + ")"
}

img.mousedown(function(e) {
	if (isBlocked)
		return

	let index = get_box_index(e.pageX, e.pageY)
	let resizing = get_box_resize_index(e.pageX, e.pageY)

	if (e.button == 0) {
		if (index == -1 && resizing == null) {
			startPoint = { x: e.pageX, y: e.pageY }
			currBox = $('<div class="label-box" draggable=false></div>')
			currBox.appendTo(img)
			moveIndex = -1
		}
		else if (resizing == null) {
			movePoint = { x: e.pageX, y: e.pageY }
			currBox = entities_boxes[index]
			moveIndex = index
		}
		else {
			resizePoint = { x: e.pageX, y: e.pageY }
			currBox = entities_boxes[resizing.index]
			resizeIndex = resizing.index
			resizeType = resizing.type
		}
	}
	else if (e.button == 2) {
		if (index == -1 && resizing != null)
			index = resizing.index

		if (index == -1)
			return

		entities_boxes[index].remove()
		entities.splice(index, 1)
		entities_boxes.splice(index, 1)
	}

	show_entities()
})

img.mouseup(function(e) {
	if (e.button != 0)
		return

	if (isBlocked) {
		if (e.target.tagName != "SELECT") {
			currBox.remove()
			startPoint = null
			endPoint = null
			isBlocked = false
		}

		return
	}

	if (moveIndex == -1 && resizeIndex == -1) {
		endPoint = { x: e.pageX, y: e.pageY }
		let width = Math.abs(startPoint.x - endPoint.x)
		let height = Math.abs(startPoint.y - endPoint.y)

		if (width < diff || height < diff) {
			currBox.remove()
			startPoint = null
			endPoint = null
			return
		}

		let select = $('<select id="label-select"><option>Select label</option><option>' + labels.join("</option><option>") + '</option></select>')
		select.appendTo(currBox)
		select.css({
			"position" : "relative",
			"top" : e.offsetY + "px",
			"left" : e.offsetX + "px",
		})

		select.focus()
		isBlocked = true

		select.change(function() {
			let label = select.val()

			currBox.css("background", get_color(label, true))
			currBox.css("border", "2px solid " + get_color(label))

			let text = $("<p>" + label + "</p>")
			text.css({
				"position" : "relative",
				"text-align" : "center",
				"margin" : "0",
				"color" : get_color(label)
			})

			select.remove()
			text.appendTo(currBox)

			entities.push(get_box(startPoint, endPoint, label))
			entities_boxes.push(currBox)

			startPoint = null
			endPoint = null
			isBlocked = false
			show_entities()
		})
	}

	moveIndex = -1
	resizeIndex = -1
	show_entities()
})

img.mousemove(function(e) {
	if (isBlocked)
		return

	if (startPoint == null && moveIndex == -1 && resizeIndex == -1) {
		let index = get_box_index(e.pageX, e.pageY)

		for (let i = 0; i < entities.length; i++)
			entities_boxes[i].css('border', "2px solid " + get_color(entities[i].label))

		if (index != -1) {
			entities_boxes[index].css('border', "2px dashed #ffbc00")
			entities_boxes[index].css('cursor', "pointer")
			return					
		}

		let resizing = get_box_resize_index(e.pageX, e.pageY)

		if (resizing != null) {
			entities_boxes[resizing.index].css('border-' + borders[resizing.type - 1], "2px dashed #ffbc00")

			if (resizing.type == 1 || resizing.type == 3)
				entities_boxes[resizing.index].css('cursor', "w-resize")
			else
				entities_boxes[resizing.index].css('cursor', "s-resize")
			return
		}

		return
	}

	if (moveIndex > -1) {
		let dx = e.pageX - movePoint.x
		let dy = e.pageY - movePoint.y

		movePoint.x = e.pageX
		movePoint.y = e.pageY

		box = entities[moveIndex]
		box.x += dx
		box.y += dy

		if (box.x + box.width > img.width)
			box.x = img.width - box.width - 1

		show_entities()
	}
	else if (resizeIndex > -1) {
		let dx = e.pageX - resizePoint.x
		let dy = e.pageY - resizePoint.y

		resizePoint.x = e.pageX
		resizePoint.y = e.pageY

		box = entities[resizeIndex]

		if (resizeType == 1) {
			box.x += dx
			box.width -= dx
		}
		else if (resizeType == 2) {
			box.y += dy
			box.height -= dy
		}
		else if (resizeType == 3) {
			box.width += dx
		}
		else if (resizeType == 4) {
			box.height += dy
		}
		
		if (box.height < 1) 
			resizeType = resizeType == 2 ? 4 : 2;

		if (box.width < 1) 
			resizeType = resizeType == 3 ? 1 : 3;

		show_entities()
	}
	else {
		point = { x: e.pageX, y: e.pageY }
		box = get_box(startPoint, point)
	}

	currBox.css({
		"border": "2px dotted #ffbc00",
        "position": "absolute",
        "top": box.y + "px",
        "left": box.x + "px",
        "width": box.width + "px",
        "height": box.height + "px",
	})
})
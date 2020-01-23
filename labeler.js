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

var offsetLeft = img.offset().left
var offsetTop = img.offset().top

function get_point(e) {
	return { x: e.pageX - offsetLeft, y: e.pageY - offsetTop }
}

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

		if (x >= box.x + diff && y >= box.y + diff && x <= box.x + box.width - diff && y <= box.y + box.height - diff)
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
	let image = $('.labeler-image img')
	let name = image.attr("src")
	let index = name.lastIndexOf('/')

	if (index > -1)
		name = name.substring(index)

	width = image.width()
	height = image.height()

	let tmp = []

	for (let i = 0; i < entities.length; i++) {
		tmp.push({
			label: entities[i].label,
			x: Math.max(0, entities[i].x / width),
			y: Math.max(0, entities[i].y / height),
			width: Math.min(entities[i].width / width, 1),
			height: Math.min(entities[i].height / height, 1),
		})
	}

	$("#entities-data").text(JSON.stringify({ name: name, entities: tmp }, null, "  "));
}

function get_color(label, opacity = false) {
	return "rgba(" + colors[labels.indexOf(label)] + (opacity ? ", 0.15" : "") + ")"
}

function boxes_hover(p) {
	let index = get_box_index(p.x, p.y)

	for (let i = 0; i < entities.length; i++)
		entities_boxes[i].css('outline', "2px solid " + get_color(entities[i].label))

	if (index != -1) {
		entities_boxes[index].css('outline', "2px dashed #ffbc00")
		img.css('cursor', "pointer")
		return
	}

	img.css('cursor', "default")

	let resizing = get_box_resize_index(p.x, p.y)

	if (resizing != null) {
		if (resizing.type == 1 || resizing.type == 3)
			img.css('cursor', "w-resize")
		else
			img.css('cursor', "s-resize")
		return
	}
}

function start_labeling() {
	let select = $('<select id="label-select"><option>Select label</option><option>' + labels.join("</option><option>") + '</option></select>')
	select.appendTo(currBox)
	select.css({
		"position" : "absolute",
		"top" : endPoint.y - Math.min(startPoint.y, endPoint.y) + "px",
		"left" : endPoint.x - Math.min(startPoint.x, endPoint.x) + "px",
	})

	select.focus()
	isBlocked = true

	select.change(function() {
		end_labeling(select)
	})

	select.keydown(function(e) {
		let option = parseInt(e.key)

		if (Number.isInteger(option) && option > 0 && option <= labels.length) {
			select.prop('selectedIndex', option)
			end_labeling(select)
		}
	})
}

function end_labeling(select) {
	let label = select.val()

	currBox.css("background", get_color(label, true))
	currBox.css("outline", "2px solid " + get_color(label))

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
}

function is_valid(p) {
	let imageWidth = $(".labeler-image img").width()
	let imageHeight = $(".labeler-image img").height()
	let dst = moveIndex == -1 && resizeIndex == -1 ? diff : 0;

	if (p.x < -dst || p.y < -dst || p.x > imageWidth + dst || p.y > imageHeight + dst)
		return false

	return true
}

$(document).mousedown(function(e) {
	if (isBlocked)
		return

	let p = get_point(e)

	if (!is_valid(p))
		return

	let index = get_box_index(p.x, p.y)
	let resizing = get_box_resize_index(p.x, p.y)

	if (e.button == 0) {
		if (index == -1 && resizing == null) {
			startPoint = { x: p.x, y: p.y }
			currBox = $('<div class="label-box" draggable=false></div>')
			currBox.appendTo(img)
			moveIndex = -1
		}
		else if (resizing == null) {
			movePoint = { x: p.x, y: p.y }
			currBox = entities_boxes[index]
			moveIndex = index
		}
		else {
			resizePoint = { x: p.x, y: p.y }
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

$(document).mouseup(function(e) {
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

	if (startPoint != null && moveIndex == -1 && resizeIndex == -1) {
		endPoint = get_point(e)

		let imageWidth = $(".labeler-image img").width()
		let imageHeight = $(".labeler-image img").height()

		if (endPoint.x > imageWidth)
			endPoint.x = imageWidth

		if (endPoint.y > imageHeight)
			endPoint.y = imageHeight

		let width = Math.abs(startPoint.x - endPoint.x)
		let height = Math.abs(startPoint.y - endPoint.y)

		if (width < diff || height < diff) {
			currBox.remove()
			startPoint = null
			endPoint = null
			return
		}

		start_labeling()
	}

	moveIndex = -1
	resizeIndex = -1
	show_entities()
})

$(document).mousemove(function(e) {
	if (isBlocked)
		return

	let p = get_point(e)

	if (startPoint == null && moveIndex == -1 && resizeIndex == -1) {
		boxes_hover(p)
		return
	}

	if ((moveIndex > -1 || resizeIndex > -1) && !is_valid(p))
		return

	let imageWidth = $(".labeler-image img").width()
	let imageHeight = $(".labeler-image img").height()

	if (moveIndex > -1) {
		let dx = p.x - movePoint.x
		let dy = p.y - movePoint.y

		movePoint.x = p.x
		movePoint.y = p.y

		box = entities[moveIndex]
		box.x += dx
		box.y += dy

		show_entities()
	}
	else if (resizeIndex > -1) {
		let dx = p.x - resizePoint.x
		let dy = p.y - resizePoint.y

		resizePoint.x = p.x
		resizePoint.y = p.y

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
		point = { x: p.x, y: p.y }

		if (!is_valid(p)) {
			if (point.x > imageWidth)
				point.x = imageWidth;

			if (point.y > imageHeight)
				point.y = imageHeight;
		}

		box = get_box(startPoint, point)
	}

	if (box.y < 1)
		box.y = 0;

	if (box.x < 1)
		box.x = 0;

	if (box.x + box.width > imageWidth)
		box.x = imageWidth - box.width;

	if (box.y + box.height > imageHeight)
		box.y = imageHeight - box.height;

	currBox.css({
		"outline": "2px dotted #ffbc00",
		"position": "absolute",
		"top": box.y + "px",
		"left": box.x + "px",
		"width": box.width + "px",
		"height": box.height + "px",
	})
})

$("#reset-btn").click(function(e) {
	if (entities.length > 0 && confirm("Remove all: are you sure?")) {
		for (let i = 0; i < entities_boxes.length; i++)
			entities_boxes[i].remove()

		entities = []
		entities_boxes = []
		show_entities()
	}
})

show_entities()
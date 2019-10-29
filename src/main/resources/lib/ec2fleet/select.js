
window.ec2fleet = window.ec2fleet || {'dialog': null, 'body': null};
window.ec2fleet.init = function () {
    if (!(window.ec2fleet.dialog)) {
        var div = document.createElement("DIV");
        document.body.appendChild(div);
        div.innerHTML = "<div id='credentialsDialog'><div class='bd'></div></div>";
        window.ec2fleet.body = $('credentialsDialog');
        window.ec2fleet.dialog = new YAHOO.widget.Panel(window.ec2fleet.body, {
            fixedcenter: true,
            close: true,
            draggable: true,
            zindex: 1000,
            modal: true,
            visible: false,
            keylisteners: [
                new YAHOO.util.KeyListener(document, {keys:27}, {
                    fn:(function() {window.ec2fleet.dialog.hide();}),
                    scope:document,
                    correctScope:false
                })
            ]
        });
        window.ec2fleet.dialog.render();
    }
};
window.ec2fleet.add = function (e) {
    window.ec2fleet.init();
    new Ajax.Request(e, {
        method: 'get',
        requestHeaders: {'Crumb': crumb},
        onSuccess: function (t) {
            window.ec2fleet.body.innerHTML = t.responseText;
            Behaviour.applySubtree(window.ec2fleet.body, false);
            window.ec2fleet.form = $('credentials-dialog-form');
            // window.ec2fleet.form.action = e;
            var r = YAHOO.util.Dom.getClientRegion();
            window.ec2fleet.dialog.cfg.setProperty("width", r.width * 3 / 4 + "px");
            window.ec2fleet.dialog.cfg.setProperty("height", r.height * 3 / 4 + "px");
            window.ec2fleet.dialog.center();
            window.ec2fleet.dialog.show();
        }
    });
    return false;
};
window.ec2fleet.refreshAll = function () {
    $$('select.ec2fleet-select').each(function (e) {
        var deps = [];

        function h() {
            var params = {};
            deps.each(function (d) {
                params[d.name] = controlValue(d.control);
            });
            var value = e.value;
            updateListBox(e, e.getAttribute("fillUrl"), {
                parameters: params,
                onSuccess: function () {
                    if (value == "") {
                        // reflect the initial value. if the control depends on several other SELECT.select,
                        // it may take several updates before we get the right items, which is why all these precautions.
                        var v = e.getAttribute("value");
                        if (v) {
                            e.value = v;
                            if (e.value == v) {
                                e.removeAttribute("value");
                            } // we were able to apply our initial value
                        }
                    }

                    // if the update changed the current selection, others listening to this control needs to be notified.
                    if (e.value != value) {
                        fireEvent(e, "change");
                    }
                }
            });
        }

        var v = e.getAttribute("fillDependsOn");
        if (v != null) {
            v.split(" ").each(function (name) {
                var c = findNearBy(e, name);
                if (c == null) {
                    if (window.console != null) {
                        console.warn("Unable to find nearby " + name);
                    }
                    if (window.YUI != null) {
                        YUI.log("Unable to find a nearby control of the name " + name, "warn")
                    }
                    return;
                }
                deps.push({name: Path.tail(name), control: c});
            });
        }
        h();
    });
};
window.ec2fleet.addSubmit = function (e) {
    var id;
    var containerId = "container" + (iota++);

    var responseDialog = new YAHOO.widget.Panel("wait" + (iota++), {
        fixedcenter: true,
        close: true,
        draggable: true,
        zindex: 4,
        modal: true,
        visible: false
    });

    responseDialog.setHeader("Error");
    responseDialog.setBody("<div id='" + containerId + "'></div>");
    responseDialog.render(document.body);
    var target; // iframe

    function attachIframeOnload(target, f) {
        if (target.attachEvent) {
            target.attachEvent("onload", f);
        } else {
            target.onload = f;
        }
    }

    var f = $('credentials-dialog-form');
    // create a throw-away IFRAME to avoid back button from loading the POST result back
    id = "iframe" + (iota++);
    target = document.createElement("iframe");
    target.setAttribute("id", id);
    target.setAttribute("name", id);
    target.setAttribute("style", "height:100%; width:100%");
    $(containerId).appendChild(target);

    attachIframeOnload(target, function () {
        if (target.contentWindow && target.contentWindow.applyCompletionHandler) {
            // apply-aware server is expected to set this handler
            target.contentWindow.applyCompletionHandler(window);
        } else {
            // otherwise this is possibly an error from the server, so we need to render the whole content.
            var r = YAHOO.util.Dom.getClientRegion();
            responseDialog.cfg.setProperty("width", r.width * 3 / 4 + "px");
            responseDialog.cfg.setProperty("height", r.height * 3 / 4 + "px");
            responseDialog.center();
            responseDialog.show();
        }
        window.setTimeout(function () {// otherwise Firefox will fail to leave the "connecting" state
            $(id).remove();
        }, 0)
    });

    f.target = target.id;
    try {
        buildFormTree(f);
        f.submit();
    } finally {
        f.target = null;
    }
    window.ec2fleet.dialog.hide();
    return false;
};
Behaviour.specify("BUTTON.ec2fleet-add-menu", 'credentials-select', -99, function(e) {
    var btn = $(e);
    var menu = btn.next('DIV.ec2fleet-add-menu-items');
    if (menu) {
        var menuAlign = (btn.getAttribute("menualign") || "tl-bl");

        var menuButton = new YAHOO.widget.Button(btn, {
            type: "menu",
            menu: menu,
            menualignment: menuAlign.split("-"),
            menuminscrollheight: 250
        });
        $(menuButton._button).addClassName(btn.className);    // copy class names
        $(menuButton._button).setAttribute("suffix", btn.getAttribute("suffix"));
        menuButton.getMenu().clickEvent.subscribe(function (type, args, value) {
            var item = args[1];
            if (item.cfg.getProperty("disabled")) {
                return;
            }
            window.ec2fleet.add(item.srcElement.getAttribute('data-url'));
        });
        // YUI menu will not parse disabled when using DIV-LI only when using SELECT-OPTION
        // but SELECT-OPTION doesn't support images, so we need to catch the rendering and roll our
        // own disabled attribute support
        menuButton.getMenu().beforeShowEvent.subscribe(function(type,args,value){
            var items = this.getItems();
            for (var i = 0; i < items.length; i++) {
                if (items[i].srcElement.getAttribute('disabled')) {
                    items[i].cfg.setProperty('disabled', true);
                }
            }
        });
    }
    e=null;
});
Behaviour.specify("BUTTON.ec2fleet-add", 'credentials-select', 0, function (e) {
    makeButton(e, e.disabled ? null : window.ec2fleet.add);
    e = null; // avoid memory leak
});
Behaviour.specify("DIV.ec2fleet-select-control", 'credentials-select', 100, function (d) {
    d = $(d);
    var buttons = d.getElementsBySelector("INPUT.ec2fleet-select-radio-control");
    var u = (function () {
        for (var i = 0; i < this.length; i++) {
            this[i]();
        }
    }).bind(buttons.collect(function (x) {
        return (function () {
            if (x.checked) {
                this.addClassName('credentials-select-content-active');
                this.removeClassName('credentials-select-content-inactive');
                this.removeAttribute('field-disabled');
            } else {
                this.addClassName('credentials-select-content-inactive');
                this.removeClassName('credentials-select-content-active');
                this.setAttribute('field-disabled', 'true');
            }
        }).bind(d.getElementsBySelector(x.value == 'select'
            ? "DIV.ec2fleet-select-content-select"
            : "DIV.ec2fleet-select-content-param")[0]);
    }));
    u();
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].onclick = buttons[i].onchange = u;
    }
    d = null;
    buttons = null;
    u = null;
});
Behaviour.specify("INPUT.ec2fleet-select", 'credentials-select', -100, function (x) {
    x.onchange = x.oninput = x.onkeyup = (function() {
        if (!this.value.startsWith('${')) {
            this.next().show();
        } else if (this.value=='' || this.value=='${}' || this.value.indexOf('}')!=this.value.length-1) {
            this.next().show();
        } else {
            this.next().hide();
        }
    }).bind($(x));
    x.onchange();
});
Behaviour.specify("DIV.include-user-credentials", 'include-user-credentials', 0, function (e) {
    // e.querySelector("input[name='includeUser']").onclick = function (evt) {
    //     var caution = e.querySelector('span.user-credentials-caution');
    //     caution.hidden = !this.checked;
    // };
    // simpler version of f:helpLink using inline help text
    // e.querySelector('a.help-btn').onclick = function (evt) {
    //     var help = e.querySelector('.help-content');
    //     help.hidden = !help.hidden;
    // };
});
window.setTimeout(function() {
    // HACK: can be removed once base version of Jenkins has fix of https://issues.jenkins-ci.org/browse/JENKINS-26578
    // need to apply the new behaviours to existing objects
    var controls = document.getElementsByClassName('credentials-select-control');
    var count = controls.length;
    for (var i = 0; i < count; i++) {
        Behaviour.applySubtree(controls[i], true);
    }
},1);
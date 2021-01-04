const response = (res, code, success, message, result) => {
    if (code == 200) {
        return res.json({
            code: code,
            success: success != null ? success : "",
            message: message != null ? message : "",
            result: result != null ? result : ""
        })
    } else {
        return res.json({
            code: code,
            error: success != null ? success : "",
            message: message != null ? message : "",
            result: result != null ? result : ""
        })
    }
}

module.exports = response;
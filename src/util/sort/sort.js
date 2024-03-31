const shiftElementToEnd = (array) => {
    const [lastElement] = array.splice(0, 1)
    console.log({ lastElement, array })
    array.push(lastElement)
    return array
}

export default {
    shiftElementToEnd
}
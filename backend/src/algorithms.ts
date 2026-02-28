function binaryInsert<T>(
    arr: T[],
    value: T,
    compare: (a: T, b: T) => number
):  void {
    let left = 0;
    let right = arr.length;

    while (left < right) {
        const mid = left + ((right - left) >> 1);
        if (compare(arr[mid], value) < 0) {
        left = mid + 1;
        } else {
        right = mid;
        }
    }

    arr.splice(left, 0, value);
}

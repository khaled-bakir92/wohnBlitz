"""Example test file to ensure pytest is working correctly."""


def test_example():
    """Basic test to verify pytest is working."""
    assert True


def test_math():
    """Test basic math operations."""
    assert 2 + 2 == 4
    assert 5 * 5 == 25


class TestExample:
    """Example test class."""

    def test_string_operations(self):
        """Test string operations."""
        text = "hello world"
        assert text.upper() == "HELLO WORLD"
        assert len(text) == 11

    def test_list_operations(self):
        """Test list operations."""
        my_list = [1, 2, 3, 4, 5]
        assert len(my_list) == 5
        assert my_list[0] == 1
        assert my_list[-1] == 5

const User = require('../model/users');
const usersController={
    getUserInfo: async (request, response)=>{
        try {
            const user = await User.findById(request.user.id)
                .select('name email role adminId')
                .lean();
            if (!user) {
                return response.status(404).json({message: 'User not found'});
            }
            return response.json({user: user});
        } 
        catch (error) {
            return response.status(500).json({message: 'Internal Server Error'});
        }
    },
};
module.exports=usersController;